/**
 * lib/ocr/openrouterExtractor.ts
 *
 * OpenRouter-based fallback extraction API matching the Gemini extraction shape.
 */

import { keyPool } from '@/lib/openrouter/KeyPool';
import type { ExtractedRow, ExtractionResult } from './geminiExtractor';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const EXTRACTION_PROMPT = `
You are a forensic medical records transcription engine specialized in Indian correctional facility health registers.
Your task: extract every patient row from this register image.

═══════════════════════════════════════════
OUTPUT FORMAT — STRICT JSON ONLY
═══════════════════════════════════════════
Return ONLY a valid JSON array. No explanation, no markdown, no code blocks. Raw JSON array starting with [ and ending with ]

[
  {
    "sno": 1,
    "name": "RAMESH KUMAR",
    "father_name": "SURESH",
    "age": 34,
    "sex": "M",
    "mobile": "9876543210",
    "confidence": 0.95
  }
]

If a field is unreadable or absent: use null (not "", not "?").
confidence: 0.0 to 1.0 per row based on YOUR certainty.

NAME: Extract exactly as written. ALL CAPS. Use full name.
AGE: Integer only.
SEX: M or F.
MOBILE: exactly 10 digits, starting with 6, 7, 8, or 9.
`;

export async function extractRegisterImageOpenRouter(
  buffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<ExtractionResult & { duplicates?: any[] }> {
  const startTime = Date.now();
  const acquired = await keyPool.acquire();

  try {
    const base64Data = buffer.toString('base64');
    const defaultModel = process.env.OPENROUTER_DEFAULT_MODEL || 'openai/gpt-4o-2024-11-20';

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${acquired.apiKey}`,
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'TB-PWA',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: defaultModel,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: EXTRACTION_PROMPT },
            { 
              type: 'image_url', 
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`
              }
            }
          ]
        }],
        temperature: 0.05,
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('OpenRouter API rate limit exceeded');
      }
      const errText = await response.text();
      throw new Error(`OpenRouter Error ${response.status}: ${errText}`);
    }

    const result = await response.json();
    const costUsd = result.usage?.total_cost ?? 0;
    
    // Release key
    await acquired.release(false, costUsd);

    const messageContent = result.choices?.[0]?.message?.content || '';
    
    // Parse json
    const jsonMatch = messageContent.match(/\[\s*\{.*\}\s*\]/s);
    let extractedData = [];
    if (jsonMatch) {
      try {
        extractedData = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn('Failed to parse OpenRouter output string:', messageContent);
      }
    }

    // Deduplication step
    const duplicates: Array<{ original: ExtractedRow; duplicate: ExtractedRow }> = [];
    const seen = new Map<string, ExtractedRow>();

    const rows: ExtractedRow[] = [];
    for (const raw of extractedData) {
      const row: ExtractedRow = {
        sno: typeof raw.sno === 'number' ? raw.sno : null,
        name: typeof raw.name === 'string' ? raw.name : null,
        father_name: typeof raw.father_name === 'string' ? raw.father_name : null,
        age: typeof raw.age === 'number' ? raw.age : null,
        ward: typeof raw.ward === 'string' ? raw.ward : null,
        address: typeof raw.address === 'string' ? raw.address : null,
        mobile: typeof raw.mobile === 'string' ? raw.mobile : null,
        confidence_score: typeof raw.confidence === 'number' ? raw.confidence : 0,
      };

      const key = `${row.name?.toLowerCase()}-${row.age}`;
      if (seen.has(key) && row.name) {
        duplicates.push({ original: seen.get(key)!, duplicate: row });
      } else {
        seen.set(key, row);
      }
    }

    return {
      rows: Array.from(seen.values()),
      duplicates,
      modelVersion: defaultModel,
      latencyMs: Date.now() - startTime,
      keyIndex: acquired.keyIndex,
    };

  } catch (error: any) {
    const isRateLimit = error.message.includes('rate limit');
    await acquired.release(isRateLimit);
    throw error;
  }
}
