import 'server-only';

import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export interface DistrictAnalysis {
  district: string;
  summary: string;
  insights: string[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  spokenResponse: string;
  presentationCue?: 'intro' | 'midpoint' | 'outro';
}

export interface MapCommandContext {
  command: string;
  districtData: any[];
  selectedDistrict?: string;
  activeMetric?: string;
}

export async function analyzeDistrictWithGemini(context: MapCommandContext): Promise<DistrictAnalysis> {
  const districtName = context.selectedDistrict || extractDistrictFromCommand(context.command);
  const district = context.districtData.find(d => 
    d.district.toLowerCase().includes(districtName.toLowerCase())
  );

  if (!district) {
    return {
      district: districtName,
      summary: `No data found for ${districtName}`,
      insights: [],
      recommendations: [],
      riskLevel: 'low',
      spokenResponse: `Sir, I couldn't find any data for ${districtName}. It might not be in our database yet.`
    };
  }

  const prompt = `
You are Sonic, an energetic AI assistant analyzing TB patient data for healthcare workers in India. 
Analyze this district data and provide insights in Sonic's personality (fast, energetic, helpful).

District: ${district.district}
Screened Patients: ${district.screened}
TB Diagnosed: ${district.diagnosed}
SLA Breaches: ${district.breachCount}
Breach Rate: ${district.breachRate.toFixed(1)}%

User Command: "${context.command}"

Provide a JSON response with:
1. summary: One sentence overview (max 20 words)
2. insights: Array of 3-4 key insights
3. recommendations: Array of 2-3 recommendations
4. riskLevel: "low", "medium", "high", or "critical"
5. spokenResponse: Natural, energetic Sonic response (2-3 sentences)
6. presentationCue: 
   - Use "midpoint" if breaches are high (>50) or growth is concerning.
   - Use "intro" if this is a first-time look at a district.
   - Use "outro" if everything is perfect (zero breaches).
   - Otherwise null.

Focus on urgency and actionable steps!
`;

  try {
    const { text } = await generateText({
      model: google('gemini-flash-latest'),
      prompt,
      temperature: 0.7,
    });
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      return {
        district: district.district,
        ...analysis
      };
    }
  } catch (error) {
    console.error('Gemini API error:', error);
  }

  return generateFallbackAnalysis(district);
}

function extractDistrictFromCommand(command: string): string {
  const words = command.toLowerCase().split(' ');
  const showIndex = words.indexOf('show');
  if (showIndex !== -1 && words[showIndex + 1]) {
    return words[showIndex + 1];
  }
  return words[words.length - 1];
}

function generateFallbackAnalysis(district: any): DistrictAnalysis {
  const breachRate = district.breachRate;
  const yieldRate = (district.diagnosed / district.screened) * 100;
  
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (breachRate > 80) riskLevel = 'critical';
  else if (breachRate > 60) riskLevel = 'high';
  else if (breachRate > 40) riskLevel = 'medium';

  const insights = [
    `${district.screened} patients screened with ${district.breachCount} SLA breaches (${breachRate.toFixed(1)}%)`,
    `Diagnostic yield: ${yieldRate.toFixed(1)}% (${district.diagnosed} diagnosed)`,
    `Treatment pipeline: ${district.initiated} initiated, ${district.completed} completed`
  ];

  if (breachRate > 70) {
    insights.push(`⚠️ Critical breach rate - immediate action needed!`);
  }

  const recommendations = [];
  if (breachRate > 60) {
    recommendations.push('Prioritize follow-up for pending cases');
    recommendations.push('Review workflow bottlenecks causing delays');
  }
  if (yieldRate < 10) {
    recommendations.push('Investigate low diagnostic yield - screening quality check needed');
  }
  if (district.initiated < district.diagnosed * 0.8) {
    recommendations.push('Focus on treatment initiation - gap between diagnosis and ATT start');
  }

  let spokenResponse = `${district.district} has ${district.screened} screened patients Sir! `;
  if (breachRate > 70) {
    spokenResponse += `⚠️ Critical alert - ${breachRate.toFixed(0)}% breach rate! We need to move fast! 💨`;
  } else if (breachRate > 40) {
    spokenResponse += `Breach rate is ${breachRate.toFixed(0)}% - needs attention Sir! 📊`;
  } else {
    spokenResponse += `Looking good with ${breachRate.toFixed(0)}% breach rate! Keep it up! ✅`;
  }

  return {
    district: district.district,
    summary: `${district.screened} screened, ${district.breachCount} breaches (${breachRate.toFixed(1)}%)`,
    insights,
    recommendations,
    riskLevel,
    spokenResponse
  };
}

export async function generateComparativeAnalysis(districts: any[]): Promise<string> {
  if (districts.length === 0) return "No districts to compare Sir!";

  const prompt = `
You are Sonic analyzing TB data across multiple districts. Compare these districts and provide insights:

${districts.map((d, i) => `
District ${i + 1}: ${d.district}
- Screened: ${d.screened}
- Breaches: ${d.breachCount} (${d.breachRate.toFixed(1)}%)
- Yield: ${((d.diagnosed / d.screened) * 100).toFixed(1)}%
`).join('\n')}

Provide a brief comparison (3-4 sentences) highlighting:
1. Best and worst performing districts
2. Key patterns or trends
3. One actionable recommendation

Respond as Sonic (energetic, helpful, uses emojis). Keep it under 100 words.
`;

  try {
    const { text } = await generateText({
      model: google('gemini-flash-latest'),
      prompt,
      temperature: 0.7,
    });
    return text;
  } catch (error) {
    console.error('Gemini API error:', error);
    
    const sorted = [...districts].sort((a, b) => b.breachRate - a.breachRate);
    const worst = sorted[0];
    const best = sorted[sorted.length - 1];
    
    return `Comparing ${districts.length} districts Sir! 📊 ${worst.district} needs urgent attention with ${worst.breachRate.toFixed(0)}% breaches, while ${best.district} is performing well at ${best.breachRate.toFixed(0)}%! Let's focus on the high-risk areas first! 💨`;
  }
}

export async function generateTrendAnalysis(historicalData: any[]): Promise<string> {
  const prompt = `
You are Sonic analyzing TB screening trends over time. Analyze this data:

${historicalData.map((d, i) => `
Period ${i + 1}: ${d.period}
- Total Screened: ${d.screened}
- Breaches: ${d.breaches}
- Yield: ${d.yield}%
`).join('\n')}

Identify trends and provide insights (2-3 sentences) as Sonic. Include emojis and keep it energetic!
`;

  try {
    const { text } = await generateText({
      model: google('gemini-flash-latest'),
      prompt,
      temperature: 0.7,
    });
    return text;
  } catch (error) {
    console.error('Gemini API error:', error);
    return "Trend analysis unavailable right now Sir! But I'm still watching the data! 👀";
  }
}
