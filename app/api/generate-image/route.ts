import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface ImageRequest {
  prompt: string;
  style: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ImageRequest = await request.json();
    const { prompt, style } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid prompt' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const enhancedPrompt = `Generate a ${style} image: ${prompt}. High quality, detailed, professional.`;

    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: enhancedPrompt,
            },
          ],
        },
      ],
    });

    const result = response.response;
    const text = result.text();

    return NextResponse.json(
      {
        imageUrl: null,
        description: text,
        message: 'Image generation requires integration with dedicated image models',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Image generation error:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
