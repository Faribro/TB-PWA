import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEYS = [
  process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_2,
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_3,
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_4,
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_5,
].filter(Boolean) as string[];

let currentKeyIndex = 0;

function getNextApiKey(): string | null {
  if (GEMINI_API_KEYS.length === 0) return null;
  const key = GEMINI_API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;
  return key || null;
}

export async function POST(req: NextRequest) {
  try {
    const { lang, guide } = await req.json();

    if (!lang || !guide) {
      return NextResponse.json(
        { error: 'Missing lang or guide in request body' },
        { status: 400 }
      );
    }

    if (lang === 'en') {
      return NextResponse.json(guide);
    }

    const apiKey = getNextApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No Gemini API keys configured' },
        { status: 500 }
      );
    }

    const prompt = `
You are translating a UI guide for a TB screening dashboard used in India.

Translate the following JSON from English to language code "${lang}".
Rules:
- Keep proper nouns unchanged: GIS, M&E, NIKSHAY, Dashboard, Vertex, TB, Excel
- Translate naturally, not word-for-word
- Keep all emoji characters as-is
- Return ONLY valid JSON, no explanation

Input JSON:
${JSON.stringify(guide, null, 2)}
    `.trim();

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2 },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error('Gemini guide translation error:', errText);
      return NextResponse.json(guide); // Fallback to original guide
    }

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Strip markdown code fences if present
    const clean = raw.replace(/```json|```/g, '').trim();
    const translated = JSON.parse(clean);

    return NextResponse.json(translated);
  } catch (error: any) {
    console.error('Guide translation error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
