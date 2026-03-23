import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';

const GEMINI_API_KEYS = [
  process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_2,
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_3,
].filter(Boolean);

let currentKeyIndex = 0;

function getNextApiKey(): string | null {
  if (GEMINI_API_KEYS.length === 0) return null;
  const key = GEMINI_API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;
  return key || null;
}

function createGoogleAI() {
  const apiKey = getNextApiKey();
  if (!apiKey) throw new Error('No Gemini API keys available');
  return createGoogleGenerativeAI({ apiKey });
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, context } = await req.json();

    const google = createGoogleAI();

    const result = await streamText({
      model: google('gemini-2.0-flash-exp'),
      system: `You are GENIE, a warm TB programme analyst. Speak naturally and conversationally. 
Keep responses under 50 words. Use the provided district data to answer questions accurately.`,
      prompt: `${JSON.stringify(context)}\n\nUser: ${prompt}`,
    });

    return (result as any).toDataStreamResponse();
  } catch (error: any) {
    console.error('Stream error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
