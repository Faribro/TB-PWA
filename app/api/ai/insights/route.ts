import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { stats, districts } = await req.json();
    
    // We'll use the default GEMINI_API_KEY env vars typical for NextJS AI setups
    // Utilizing the fast gemini-1.5-flash-8b model as per registry in other routes
    const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '' });
    
    const SYSTEM_PROMPT = `You are the core intelligence AI of SAMADHAAN WORLD OS, a global health monitoring defense grid.
    Analyze the provided data on SLA Breaches and patient volumes. 
    Write a highly professional, aggressive, tactical briefing (max 2 sentences) mimicking a military radar tracking system.
    Identify the main geographic node that requires immediate medical intervention based on the numbers.
    OUTPUT PURE JSON EXCLUSIVELY. No markdown tags. Format strictly as:
    {
      "insightText": "Your tactical brief here...",
      "activeNode": "THE WORST DISTRICT NAME IN UPPERCASE"
    }`;
    
    const contextString = `
    DATA TELEMETRY INPUT:
    - High-Risk / SLA Breached Patients: ${stats.highRiskPatients}
    - Total Volume across top nodes: ${stats.totalPatients}
    - Critical District Array Data: ${JSON.stringify(districts)}
    `;

    // generateText is far more resilient than generateObject to parsing timeouts.
    const { text } = await generateText({
      model: google('gemini-1.5-flash-8b'),
      system: SYSTEM_PROMPT,
      prompt: contextString,
    });

    try {
      const cleanString = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedObject = JSON.parse(cleanString);
      return NextResponse.json({ success: true, insight: parsedObject });
    } catch (parseError) {
      console.error('Failed to parse Gemini output:', text);
      // Fallback object if the AI doesn't perfectly follow the JSON instruction
      return NextResponse.json({ 
        success: true, 
        insight: {
          insightText: text.substring(0, 200).replace(/["{}]/g, '') + '...',
          activeNode: districts[0] || 'UNKNOWN NODE'
        } 
      });
    }

  } catch (error: any) {
    console.error('Insights Generator Error:', error.message);
    return NextResponse.json({ success: false, error: 'AI Core Offline' }, { status: 500 });
  }
}
