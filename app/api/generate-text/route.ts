import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY_1!,
});

const SYSTEM_PROMPTS: Record<string, string> = {
  description: `You are a professional healthcare communications writer for India's TB screening programs. 
Write compelling, accurate descriptions. Be concise and impactful. Use plain text only.`,

  script: `You are a professional video script writer for public health content in India.
Write structured scripts with clear [INTRO], [BODY], [OUTRO] sections with speaker notes.`,

  analysis: `You are a senior TB data analyst for Alliance India. 
Provide structured analysis with: Key Findings, Trends, Risk Factors, Recommendations.
Use bullet points. Be data-driven and specific.`,
};

export async function POST(req: NextRequest) {
  const { prompt, type } = await req.json();

  if (!prompt || !type) {
    return new Response(
      JSON.stringify({ error: 'prompt and type are required' }),
      { status: 400 }
    );
  }

  const result = streamText({
    model: google('gemini-2.0-flash'),
    system: SYSTEM_PROMPTS[type] ?? SYSTEM_PROMPTS.description,
    prompt,
    temperature: type === 'analysis' ? 0.3 : 0.7,
    maxOutputTokens: 1024,
  });

  return result.toTextStreamResponse();
}
