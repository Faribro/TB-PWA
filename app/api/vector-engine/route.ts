import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface DistrictData {
  district: string;
  state: string;
  screened: number;
  diagnosed: number;
  breachCount: number;
  breachRate: number;
}

interface VectorPrediction {
  sourceName: string;
  targetName: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  transmissionProbability: number;
  reasoning: string;
}

export async function POST(req: NextRequest) {
  try {
    const { districtData } = await req.json() as { districtData: DistrictData[] };

    if (!districtData || districtData.length === 0) {
      return NextResponse.json({ error: 'No district data provided' }, { status: 400 });
    }

    // Prepare data summary for Gemini
    const topHotspots = districtData
      .filter(d => d.screened > 50)
      .sort((a, b) => b.diagnosed - a.diagnosed)
      .slice(0, 10);

    const dataContext = topHotspots.map(d => 
      `${d.district}, ${d.state}: ${d.screened} screened, ${d.diagnosed} diagnosed (${(d.diagnosed/d.screened*100).toFixed(1)}% yield), ${d.breachCount} breaches`
    ).join('\n');

    const prompt = `You are an advanced epidemiological AI analyzing TB transmission patterns across Indian districts.

DISTRICT DATA:
${dataContext}

TASK: Identify 3-5 high-risk "Source" districts with active TB transmission, and for each source, predict 1-3 vulnerable "Target" districts where cases are likely to spread based on:
1. Geographic proximity (adjacent districts)
2. High screening volume in source (indicates active surveillance)
3. High diagnosis rate in source (indicates active outbreak)
4. Lower diagnosis rate in target (indicates vulnerability)
5. Population movement patterns (urban to rural, industrial corridors)

CRITICAL: You must return ONLY a valid JSON array with this exact structure:
[
  {
    "sourceName": "District Name",
    "targetName": "Adjacent District Name",
    "riskLevel": "critical|high|medium|low",
    "transmissionProbability": 0.85,
    "reasoning": "Brief explanation"
  }
]

Rules:
- Return 8-15 transmission vectors total
- transmissionProbability must be between 0.0 and 1.0
- Use actual district names from the data provided
- Prioritize districts with high diagnosis rates as sources
- Consider geographic adjacency (e.g., Mumbai → Thane, Pune → Satara)
- Return ONLY the JSON array, no markdown, no explanation text`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract JSON from response
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const predictions: VectorPrediction[] = JSON.parse(jsonText);

    // Validate predictions
    const validPredictions = predictions.filter(p => 
      p.sourceName && 
      p.targetName && 
      p.riskLevel && 
      typeof p.transmissionProbability === 'number' &&
      p.transmissionProbability >= 0 &&
      p.transmissionProbability <= 1
    );

    console.log(`🦠 Vector Engine generated ${validPredictions.length} transmission predictions`);

    return NextResponse.json({ 
      vectors: validPredictions,
      timestamp: Date.now(),
      modelUsed: 'gemini-1.5-flash'
    });

  } catch (error) {
    console.error('Vector Engine Error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate vector predictions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
