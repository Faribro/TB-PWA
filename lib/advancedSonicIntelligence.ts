import 'server-only';

import { google } from '@ai-sdk/google';
import { generateText, streamText } from 'ai';
import { createClient } from '@supabase/supabase-js';

// In-memory cache with TTL
const analysisCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── MODULE 3: Supabase Realtime Overwatch ─────────────────────────────────────
let realtimeChannel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;

export function startRealtimeOverwatch(
  onBreachAlert: (district: string) => void
): () => void {
  if (realtimeChannel) return () => {}; // already subscribed

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  realtimeChannel = supabase
    .channel('sonic-overwatch')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'patients',
        filter: 'sla_status=eq.Breach',
      },
      (payload) => {
        const district =
          (payload.new as any)?.screening_district ||
          (payload.old as any)?.screening_district ||
          'Unknown District';
        onBreachAlert(district);
      }
    )
    .subscribe();

  return () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  };
}

export interface AdvancedDistrictAnalysis {
  district: string;
  summary: string;
  insights: string[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  spokenResponse: string;
  predictions?: {
    nextMonthBreaches: number;
    trend: 'improving' | 'stable' | 'declining';
    confidence: number;
  };
  comparisons?: {
    vsStateAverage: number;
    vsNationalAverage: number;
    ranking: number;
  };
  actionItems?: Array<{
    priority: 'urgent' | 'high' | 'medium' | 'low';
    action: string;
    impact: string;
    deadline: string;
  }>;
}

export interface StreamingCallback {
  onChunk: (text: string) => void;
  onComplete: (analysis: AdvancedDistrictAnalysis) => void;
  onError: (error: Error) => void;
}

// Streaming analysis for real-time responses
export async function streamDistrictAnalysis(
  context: any,
  callback: StreamingCallback
): Promise<void> {
  const cacheKey = `district_${context.selectedDistrict}_${Date.now()}`;
  
  const districtName = context.selectedDistrict || extractDistrictFromCommand(context.command);
  const district = context.districtData.find((d: any) => 
    d.district.toLowerCase().includes(districtName.toLowerCase())
  );

  if (!district) {
    callback.onError(new Error(`District ${districtName} not found`));
    return;
  }

  const prompt = buildAdvancedPrompt(district, context);

  try {
    const { textStream } = await streamText({
      model: google('gemini-flash-latest'),
      prompt,
      temperature: 0.7,
    });

    let fullText = '';
    for await (const chunk of textStream) {
      fullText += chunk;
      callback.onChunk(chunk);
    }

    const analysis = parseAnalysisFromText(fullText, district);
    callback.onComplete(analysis);
  } catch (error) {
    callback.onError(error as Error);
  }
}

// Batch analysis for multiple districts (optimized)
export async function batchAnalyzeDistricts(
  districts: any[],
  options: { maxConcurrent?: number; useCache?: boolean } = {}
): Promise<Map<string, AdvancedDistrictAnalysis>> {
  const { maxConcurrent = 3, useCache = true } = options;
  const results = new Map<string, AdvancedDistrictAnalysis>();
  
  // Check cache first
  if (useCache) {
    districts.forEach(d => {
      const cached = getCachedAnalysis(d.district);
      if (cached) results.set(d.district, cached);
    });
  }

  // Filter uncached districts
  const uncached = districts.filter(d => !results.has(d.district));
  
  // Process in batches
  for (let i = 0; i < uncached.length; i += maxConcurrent) {
    const batch = uncached.slice(i, i + maxConcurrent);
    const promises = batch.map(d => analyzeDistrictOptimized(d));
    const batchResults = await Promise.allSettled(promises);
    
    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        const district = batch[idx].district;
        results.set(district, result.value);
        setCachedAnalysis(district, result.value);
      }
    });
  }

  return results;
}

// Predictive analysis using historical trends
export async function generatePredictiveInsights(
  district: any,
  historicalData: any[]
): Promise<any> {
  const prompt = `
Analyze this TB district data and predict future trends:

Current District: ${district.district}
Current Breach Rate: ${district.breachRate.toFixed(1)}%
Current Yield: ${((district.diagnosed / district.screened) * 100).toFixed(1)}%

Historical Data (last 3 months):
${historicalData.map((h, i) => `
Month ${i + 1}: ${h.screened} screened, ${h.breaches} breaches (${h.breachRate}%)
`).join('\n')}

Provide JSON with:
1. nextMonthBreaches: Predicted breach count
2. trend: "improving", "stable", or "declining"
3. confidence: 0-100 confidence score
4. factors: Array of factors influencing the prediction
5. recommendations: Array of preventive actions

Be data-driven and realistic.
`;

  try {
    const { text } = await generateText({
      model: google('gemini-flash-latest'),
      prompt,
      temperature: 0.5,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Prediction error:', error);
  }

  return generateFallbackPrediction(district, historicalData);
}

// Smart command parser with NLP
export function parseSmartCommand(command: string, context: any): {
  intent: string;
  entities: any;
  confidence: number;
} {
  const cmdLower = command.toLowerCase();
  
  // Intent detection
  const intents = {
    analyze: /analyze|show|tell me about|what about|details on/i,
    compare: /compare|versus|vs|difference between/i,
    predict: /predict|forecast|future|next month|trend/i,
    navigate: /go to|fly to|zoom to|show me/i,
    aggregate: /total|sum|average|top|worst|best/i,
    filter: /filter|only|just|exclude/i,
  };

  let detectedIntent = 'unknown';
  let confidence = 0;

  for (const [intent, pattern] of Object.entries(intents)) {
    if (pattern.test(cmdLower)) {
      detectedIntent = intent;
      confidence = 0.9;
      break;
    }
  }

  // Entity extraction
  const entities: any = {
    districts: [],
    metrics: [],
    timeframe: null,
    comparison: null,
  };

  // Extract district names
  context.districtData?.forEach((d: any) => {
    if (cmdLower.includes(d.district.toLowerCase())) {
      entities.districts.push(d.district);
    }
  });

  // Extract metrics
  const metricPatterns = {
    breaches: /breach|sla|delay/i,
    screened: /screen|test|check/i,
    diagnosed: /diagnos|positive|tb case/i,
    yield: /yield|rate|percentage/i,
  };

  for (const [metric, pattern] of Object.entries(metricPatterns)) {
    if (pattern.test(cmdLower)) {
      entities.metrics.push(metric);
    }
  }

  // Extract timeframe
  if (/last month|previous month/i.test(cmdLower)) {
    entities.timeframe = 'last_month';
  } else if (/this month|current month/i.test(cmdLower)) {
    entities.timeframe = 'current_month';
  } else if (/next month|upcoming/i.test(cmdLower)) {
    entities.timeframe = 'next_month';
  }

  // Extract comparison type
  if (/top (\d+)/i.test(cmdLower)) {
    const match = cmdLower.match(/top (\d+)/i);
    entities.comparison = { type: 'top', count: parseInt(match![1]) };
  } else if (/worst (\d+)/i.test(cmdLower)) {
    const match = cmdLower.match(/worst (\d+)/i);
    entities.comparison = { type: 'worst', count: parseInt(match![1]) };
  }

  return { intent: detectedIntent, entities, confidence };
}

// Generate contextual suggestions
export function generateSmartSuggestions(
  currentContext: any,
  recentCommands: string[]
): string[] {
  const suggestions: string[] = [];
  
  // Based on current page
  if (currentContext.page === 'gis') {
    if (currentContext.selectedDistrict) {
      suggestions.push(`Compare ${currentContext.selectedDistrict} with neighbors`);
      suggestions.push(`Predict next month for ${currentContext.selectedDistrict}`);
    } else {
      suggestions.push('Show top 5 high-risk districts');
      suggestions.push('Analyze breach hotspots');
    }
  }

  // Based on data patterns
  if (currentContext.districtData) {
    const highBreach = currentContext.districtData.filter((d: any) => d.breachRate > 70);
    if (highBreach.length > 0) {
      suggestions.push(`Analyze ${highBreach[0].district} urgently`);
    }
  }

  // Based on recent commands
  if (recentCommands.length > 0) {
    const lastCommand = recentCommands[recentCommands.length - 1];
    if (lastCommand.includes('show')) {
      suggestions.push('Compare with state average');
    }
  }

  return suggestions.slice(0, 5);
}

// Helper functions
function buildAdvancedPrompt(district: any, context: any): string {
  const stateAvg = context.districtData?.reduce((sum: number, d: any) => sum + d.breachRate, 0) / 
                   (context.districtData?.length || 1);

  return `
You are Sonic, an advanced AI analyzing TB patient data with predictive capabilities.

District: ${district.district}
Screened: ${district.screened}
Diagnosed: ${district.diagnosed}
Breaches: ${district.breachCount} (${district.breachRate.toFixed(1)}%)
Yield: ${((district.diagnosed / district.screened) * 100).toFixed(1)}%
State Average Breach Rate: ${stateAvg.toFixed(1)}%

Command: "${context.command}"

Provide comprehensive JSON analysis with:
1. summary: One impactful sentence
2. insights: 4-5 data-driven insights
3. recommendations: 3-4 prioritized actions with deadlines
4. riskLevel: "low", "medium", "high", or "critical"
5. spokenResponse: Energetic Sonic response (2-3 sentences). IMPORTANT: You MUST prefix the response with one of these emotion tags: [excited], [alert], [thinking], or [greeting].
6. predictions: { nextMonthBreaches, trend, confidence }
7. comparisons: { vsStateAverage, ranking }
8. actionItems: [{ priority, action, impact, deadline }]

Be specific, actionable, and energetic like Sonic! Use emojis strategically.
`;
}

function parseAnalysisFromText(text: string, district: any): AdvancedDistrictAnalysis {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return { district: district.district, ...parsed };
    } catch (e) {
      console.error('Parse error:', e);
    }
  }
  return generateFallbackAnalysis(district);
}

function analyzeDistrictOptimized(district: any): Promise<AdvancedDistrictAnalysis> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(generateFallbackAnalysis(district));
    }, 100);
  });
}

function getCachedAnalysis(district: string): AdvancedDistrictAnalysis | null {
  const cached = analysisCache.get(district);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedAnalysis(district: string, data: AdvancedDistrictAnalysis): void {
  analysisCache.set(district, { data, timestamp: Date.now() });
}

function generateFallbackAnalysis(district: any): AdvancedDistrictAnalysis {
  const breachRate = district.breachRate;
  const yieldRate = (district.diagnosed / district.screened) * 100;
  
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (breachRate > 80) riskLevel = 'critical';
  else if (breachRate > 60) riskLevel = 'high';
  else if (breachRate > 40) riskLevel = 'medium';

  return {
    district: district.district,
    summary: `${district.screened} screened, ${district.breachCount} breaches (${breachRate.toFixed(1)}%)`,
    insights: [
      `Breach rate: ${breachRate.toFixed(1)}% ${breachRate > 70 ? '⚠️ Critical' : '✅'}`,
      `Yield rate: ${yieldRate.toFixed(1)}% ${yieldRate > 15 ? '🎯 Excellent' : '📈 Needs improvement'}`,
      `Treatment pipeline: ${district.initiated} initiated, ${district.completed} completed`,
    ],
    recommendations: [
      breachRate > 60 ? 'Urgent: Prioritize pending follow-ups' : 'Maintain current workflow',
      yieldRate < 10 ? 'Review screening quality and protocols' : 'Continue effective screening',
    ],
    riskLevel,
    spokenResponse: breachRate > 70 
      ? `[alert] ${district.district}: ${district.screened} screened Sir! High breach rate - needs urgent attention!` 
      : `[excited] ${district.district}: ${district.screened} screened Sir! Looking good!`,
    predictions: {
      nextMonthBreaches: Math.round(district.breachCount * (breachRate > 50 ? 1.1 : 0.9)),
      trend: breachRate > 50 ? 'declining' : 'improving',
      confidence: 75,
    },
    comparisons: {
      vsStateAverage: breachRate - 45,
      vsNationalAverage: breachRate - 50,
      ranking: 0,
    },
  };
}

function generateFallbackPrediction(district: any, historicalData: any[]): any {
  const avgGrowth = historicalData.length > 1 
    ? (historicalData[historicalData.length - 1].breaches - historicalData[0].breaches) / historicalData.length
    : 0;

  return {
    nextMonthBreaches: Math.max(0, Math.round(district.breachCount + avgGrowth)),
    trend: avgGrowth > 0 ? 'declining' : 'improving',
    confidence: 60,
    factors: ['Historical trend', 'Current breach rate'],
    recommendations: ['Monitor closely', 'Maintain current interventions'],
  };
}

function extractDistrictFromCommand(command: string): string {
  const words = command.toLowerCase().split(' ');
  const showIndex = words.indexOf('show');
  if (showIndex !== -1 && words[showIndex + 1]) {
    return words[showIndex + 1];
  }
  return words[words.length - 1];
}
