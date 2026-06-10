import pdfParse from 'pdf-parse-fork';
import { Redis } from '@upstash/redis';
import { REDIS_KEYS } from '../../redis-keys';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function parsePdfBuffer(buffer: Buffer): Promise<any[]> {
  // Step 1: Parse PDF text using pdf-parse-fork
  const pdfData = await pdfParse(buffer);
  const textContent = pdfData.text ? pdfData.text.trim() : '';

  if (textContent.length < 20) {
    throw new Error(
      'This PDF appears to be scanned or contains no digital text. Please upload a clear image scan (PNG/JPG) or an Excel sheet instead.'
    );
  }

  // Step 2: Rate limit using Redis (enforces 4.5s delay to keep under 15 RPM free tier limit)
  const now = Date.now();
  const lastCall = (await redis.get<number>(REDIS_KEYS.AGENT_LAST_CALL)) || 0;
  const elapsed = now - lastCall;
  if (elapsed < 4500) {
    await new Promise((resolve) => setTimeout(resolve, 4500 - elapsed));
  }
  await redis.set(REDIS_KEYS.AGENT_LAST_CALL, Date.now());

  // Step 3: Call Gemini API using parsed text content
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY in environment variables');
  }

  const prompt = `Extract patient screening records from this text document parsed from a PDF register.
Return a valid JSON object containing a "rows" key, which holds an array of objects.
Each row object must conform exactly to this schema:
{
  "id": "string representing patient ID, serial number, or register number if present, otherwise null",
  "patient_name": "string representing inmate / patient name",
  "screening_date": "string representing screening date or submission date if visible, otherwise null",
  "facility_name": "string representing facility name, prison, or site center if visible, otherwise null",
  "status": "string representing result, x-ray status, or diagnosis (e.g., 'Normal', 'Suspected TB Case', 'Screened')",
  "confidence_score": "high" | "medium" | "low"
}
If name or screening details are missing or unclear, mark "confidence_score" as "low".

Here is the document text:
---
${textContent}
---`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        }
      })
    }
  );

  if (!geminiRes.ok) {
    const errorText = await geminiRes.text();
    throw new Error(`Gemini Text API error (${geminiRes.status}): ${errorText}`);
  }

  const responseJson = await geminiRes.json();
  const rawText = responseJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Empty response returned from Gemini Text API');
  }

  try {
    const parsedResult = JSON.parse(rawText);
    return parsedResult.rows || [];
  } catch (err) {
    console.error('Failed to parse Gemini Text JSON response:', rawText);
    throw new Error('Gemini returned invalid JSON structure: ' + String(err));
  }
}
