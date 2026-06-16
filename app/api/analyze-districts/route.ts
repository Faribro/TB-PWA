import { NextRequest, NextResponse } from 'next/server';
import { generateComparativeAnalysis } from '@/lib/geminiMapAnalyzer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, districts } = body;

    if (!districts || districts.length === 0) {
      return NextResponse.json(
        { error: 'Districts data required' },
        { status: 400 }
      );
    }

    const analysis = await generateComparativeAnalysis(districts);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Comparative analysis error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}
