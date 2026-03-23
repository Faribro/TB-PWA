import { NextRequest, NextResponse } from 'next/server';

const langNames: Record<string, string> = {
  hi: 'Hindi', mr: 'Marathi', ta: 'Tamil', te: 'Telugu',
  kn: 'Kannada', gu: 'Gujarati', bn: 'Bengali', pa: 'Punjabi',
  ml: 'Malayalam', ur: 'Urdu', en: 'English',
};

// Free Google Translate endpoint — no API key, no quota issues
async function translateFree(text: string, targetLang: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Response format: [[[translated, original, ...], ...], ...]
    const parts: string[] = data[0]?.map((chunk: any[]) => chunk[0]).filter(Boolean) ?? [];
    const result = parts.join('').trim();
    return result || null;
  } catch (err: any) {
    console.warn('⚠️ Free translate error:', err?.message);
    return null;
  }
}

// Gemini fallback — rotates through all 11 keys
const GEMINI_KEYS = [
  process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_2,
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_3,
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_4,
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_5,
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_6,
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_7,
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_8,
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_9,
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_10,
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_11,
].filter(Boolean) as string[];

let keyIdx = 0;

async function translateGemini(text: string, lang: string): Promise<string | null> {
  for (let i = 0; i < GEMINI_KEYS.length; i++) {
    const key = GEMINI_KEYS[keyIdx % GEMINI_KEYS.length];
    keyIdx++;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Translate to ${langNames[lang]}. Return ONLY the translation:\n\n${text}` }] }],
            generationConfig: { temperature: 0.1 },
          }),
          signal: AbortSignal.timeout(6000),
        }
      );
      if (res.status === 429) continue;
      if (!res.ok) continue;
      const data = await res.json();
      const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (result && result !== text) return result;
    } catch { continue; }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { lang, text } = await req.json();
    if (!lang || !text) return NextResponse.json({ error: 'Missing lang or text' }, { status: 400 });
    if (lang === 'en') return NextResponse.json({ translated: text });

    const tagMatch = text.match(/^\[(excited|thinking|alert|greeting)\]/i);
    const tag = tagMatch ? tagMatch[0] : '';
    const plainText = tag ? text.slice(tag.length).trim() : text;

    console.log(`🌍 Translating to ${langNames[lang] || lang}: "${plainText.slice(0, 50)}..."`);

    // 1. Free Google Translate (primary)
    let translated = await translateFree(plainText, lang);

    // 2. Gemini key rotation (fallback)
    if (!translated || translated === plainText) {
      translated = await translateGemini(plainText, lang);
    }

    if (!translated || translated === plainText) {
      console.warn(`❌ All translation methods failed for lang=${lang}`);
      translated = plainText;
    } else {
      console.log(`✅ [${lang}]: "${translated.slice(0, 60)}..."`);
    }

    translated = translated.replace(/^["']|["']$/g, '').trim();
    return NextResponse.json({ translated: tag ? `${tag} ${translated}` : translated });

  } catch (err: any) {
    console.error('❌ Translation route error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
