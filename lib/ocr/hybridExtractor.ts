/**
 * lib/ocr/hybridExtractor.ts
 * 
 * Hybrid extraction engine: LlamaParse for PDFs, OpenRouter GPT-4o vision for images
 */

import type { ExtractedRow } from './geminiExtractor';
import { callOpenRouter } from '../openrouter';

const LLAMA_CLOUD_API_KEY = process.env.LLAMA_CLOUD_API_KEY;

const EXTRACTION_PROMPT = `You are extracting patient records from a scanned TB screening register in India.
Extract ALL patient rows. Each row represents one inmate/patient.
Return a JSON object with key 'rows' containing an array. Each item must have:
- sno: row number (integer, sequential if not visible)
- name: patient full name (string or null)
- father_name: father's or husband's name (string or null)
- age: age in years (integer or null)
- ward: ward or facility name (string or null)
- address: home address (string or null)
- mobile: mobile or contact number as string (string or null)

Rules:
- Use ALL CAPS for names
- Mobile must be exactly 10 digits starting with 6-9, or null
- Age must be 1-120 or null
- Skip header rows
- If field is unreadable: use null
- Return only the JSON object. No explanation.`;

interface LlamaParseUploadResponse {
  id: string;
  status: string;
}

interface LlamaParseJobResponse {
  id: string;
  status: 'PENDING' | 'SUCCESS' | 'ERROR' | 'PARTIAL_SUCCESS';
}

interface LlamaParseMarkdownResponse {
  markdown: string;
}

async function extractFromPDF(buffer: Buffer): Promise<{ rows: ExtractedRow[]; engine: string; latencyMs: number }> {
  const startTime = Date.now();

  if (!LLAMA_CLOUD_API_KEY) {
    throw new Error('LLAMA_CLOUD_API_KEY not configured');
  }

  // Step 1: Upload to LlamaParse
  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(buffer)], { type: 'application/pdf' }));

  const uploadRes = await fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LLAMA_CLOUD_API_KEY}`,
    },
    body: formData,
  });

  if (!uploadRes.ok) {
    throw new Error(`LlamaParse upload failed: ${uploadRes.status}`);
  }

  const uploadData: LlamaParseUploadResponse = await uploadRes.json();
  const jobId = uploadData.id;

  // Step 2: Poll for completion
  const delays = [3000, 5000, 8000, 10000];
  let attempt = 0;
  const maxAttempts = 20;

  while (attempt < maxAttempts) {
    const statusRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${LLAMA_CLOUD_API_KEY}`,
      },
    });

    if (!statusRes.ok) {
      throw new Error(`LlamaParse status check failed: ${statusRes.status}`);
    }

    const statusData: LlamaParseJobResponse = await statusRes.json();

    if (statusData.status === 'SUCCESS' || statusData.status === 'PARTIAL_SUCCESS') {
      break;
    }

    if (statusData.status === 'ERROR') {
      throw new Error('LlamaParse job failed with ERROR status');
    }

    const delay = delays[Math.min(attempt, delays.length - 1)];
    await new Promise(r => setTimeout(r, delay));
    attempt++;
  }

  if (attempt >= maxAttempts) {
    throw new Error('LlamaParse timeout: job did not complete in 90s');
  }

  // Step 3: Retrieve markdown
  const markdownRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`, {
    headers: {
      'Authorization': `Bearer ${LLAMA_CLOUD_API_KEY}`,
    },
  });

  if (!markdownRes.ok) {
    throw new Error(`LlamaParse markdown retrieval failed: ${markdownRes.status}`);
  }

  const markdownData: LlamaParseMarkdownResponse = await markdownRes.json();
  const markdown = markdownData.markdown;

  // Step 4: Send to OpenRouter GPT-4o for structured extraction
  const rows = await extractWithOpenRouter(markdown, 'text');
  const latencyMs = Date.now() - startTime;

  return { rows, engine: 'llamaparse+openrouter-gpt4o', latencyMs };
}

async function extractFromImage(buffer: Buffer, mime: string): Promise<{ rows: ExtractedRow[]; engine: string; latencyMs: number }> {
  const startTime = Date.now();
  const base64 = buffer.toString('base64');
  const rows = await extractWithOpenRouter(`data:${mime};base64,${base64}`, 'image');
  const latencyMs = Date.now() - startTime;

  return { rows, engine: 'openrouter-gpt4o-vision', latencyMs };
}

async function extractWithOpenRouter(content: string, type: 'text' | 'image'): Promise<ExtractedRow[]> {
  const messages = type === 'text'
    ? [
        {
          role: 'user' as const,
          content: `${EXTRACTION_PROMPT}\n\nRegister content (markdown):\n${content}`,
        },
      ]
    : [
        {
          role: 'user' as const,
          content: [
            {
              type: 'text' as const,
              text: `You are looking at a photo/scan of a TB screening register page from India.\n${EXTRACTION_PROMPT}`,
            },
            {
              type: 'image_url' as const,
              image_url: {
                url: content,
              },
            },
          ],
        },
      ];

  const rawContent = await callOpenRouter({
    model: 'openai/gpt-4o',
    messages,
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  let parsed: { rows?: any[] };
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new Error('OpenRouter returned invalid JSON');
  }

  if (!parsed.rows || !Array.isArray(parsed.rows)) {
    throw new Error('OpenRouter response missing rows array');
  }

  return parsed.rows.map((r: any, i: number) => ({
    sno: r.sno ?? i + 1,
    name: r.name?.toString().trim().toUpperCase() || null,
    father_name: r.father_name?.toString().trim().toUpperCase() || null,
    age: typeof r.age === 'number' && r.age > 0 && r.age <= 120 ? r.age : null,
    ward: r.ward?.toString().trim().toUpperCase() || null,
    address: r.address?.toString().trim().toUpperCase() || null,
    mobile: typeof r.mobile === 'string' && /^[6-9]\d{9}$/.test(r.mobile) ? r.mobile : null,
    confidence_score: 0.9, // Default confidence score for Gemini extraction
  }));
}

export async function extractRegisterImageHybrid(
  buffer: Buffer,
  mime: string
): Promise<{
  rows: ExtractedRow[];
  summary: {
    totalRowsParsed: number;
    validRows: number;
    invalidRows: number;
    duplicatesInFile: number;
  };
  warnings: string[];
  engine: string;
  latencyMs: number;
}> {
  const warnings: string[] = [];

  let result: { rows: ExtractedRow[]; engine: string; latencyMs: number };

  if (mime === 'application/pdf') {
    result = await extractFromPDF(buffer);
  } else if (mime.startsWith('image/')) {
    result = await extractFromImage(buffer, mime);
  } else {
    throw new Error(`Unsupported MIME type: ${mime}`);
  }

  const totalRowsParsed = result.rows.length;

  // Deduplicate by name + father_name
  const seen = new Set<string>();
  const deduped: ExtractedRow[] = [];
  let duplicatesInFile = 0;

  for (const row of result.rows) {
    const key = `${row.name || ''}-${row.father_name || ''}`;
    if (seen.has(key)) {
      duplicatesInFile++;
      continue;
    }
    seen.add(key);
    deduped.push(row);
  }

  // Assign sequential sno
  deduped.forEach((row, i) => {
    if (!row.sno) row.sno = i + 1;
  });

  const validRows = deduped.filter(r => r.name).length;
  const invalidRows = deduped.filter(r => !r.name).length;

  if (deduped.length === 0) {
    warnings.push('No rows extracted from file');
  }

  return {
    rows: deduped,
    summary: {
      totalRowsParsed,
      validRows,
      invalidRows,
      duplicatesInFile,
    },
    warnings,
    engine: result.engine,
    latencyMs: result.latencyMs,
  };
}
