import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

// Enterprise-grade API Key Management
interface ApiKeyConfig {
  key: string;
  tier: 'free' | 'paid' | 'enterprise';
  priority: number;
  healthScore: number;
  lastUsed: number;
  consecutiveFailures: number;
  totalRequests: number;
  successRate: number;
}

interface ModelConfig {
  name: string;
  tier: 'fast' | 'balanced' | 'quality';
  reliability: number;
  avgLatency: number;
  quotaPool: 'gemini' | 'gemma' | 'experimental';
}

// Dynamic API Key Pool
const API_KEY_POOL: ApiKeyConfig[] = [
  { key: process.env.GOOGLE_GENERATIVE_AI_API_KEY!, tier: 'free' as const, priority: 1, healthScore: 100, lastUsed: 0, consecutiveFailures: 0, totalRequests: 0, successRate: 100 },
  { key: process.env.GOOGLE_GENERATIVE_AI_API_KEY_2!, tier: 'free' as const, priority: 2, healthScore: 100, lastUsed: 0, consecutiveFailures: 0, totalRequests: 0, successRate: 100 },
  { key: process.env.GOOGLE_GENERATIVE_AI_API_KEY_3!, tier: 'free' as const, priority: 3, healthScore: 100, lastUsed: 0, consecutiveFailures: 0, totalRequests: 0, successRate: 100 },
  { key: process.env.GOOGLE_GENERATIVE_AI_API_KEY_4!, tier: 'free' as const, priority: 4, healthScore: 100, lastUsed: 0, consecutiveFailures: 0, totalRequests: 0, successRate: 100 },
  { key: process.env.GOOGLE_GENERATIVE_AI_API_KEY_5!, tier: 'free' as const, priority: 5, healthScore: 100, lastUsed: 0, consecutiveFailures: 0, totalRequests: 0, successRate: 100 },
  { key: process.env.GOOGLE_GENERATIVE_AI_API_KEY_6!, tier: 'free' as const, priority: 6, healthScore: 100, lastUsed: 0, consecutiveFailures: 0, totalRequests: 0, successRate: 100 },
  { key: process.env.GOOGLE_GENERATIVE_AI_API_KEY_7!, tier: 'free' as const, priority: 7, healthScore: 100, lastUsed: 0, consecutiveFailures: 0, totalRequests: 0, successRate: 100 },
  { key: process.env.GOOGLE_GENERATIVE_AI_API_KEY_8!, tier: 'free' as const, priority: 8, healthScore: 100, lastUsed: 0, consecutiveFailures: 0, totalRequests: 0, successRate: 100 },
  { key: process.env.GOOGLE_GENERATIVE_AI_API_KEY_9!, tier: 'free' as const, priority: 9, healthScore: 100, lastUsed: 0, consecutiveFailures: 0, totalRequests: 0, successRate: 100 },
  { key: process.env.GOOGLE_GENERATIVE_AI_API_KEY_10!, tier: 'free' as const, priority: 10, healthScore: 100, lastUsed: 0, consecutiveFailures: 0, totalRequests: 0, successRate: 100 },
  { key: process.env.GOOGLE_GENERATIVE_AI_API_KEY_11!, tier: 'free' as const, priority: 11, healthScore: 100, lastUsed: 0, consecutiveFailures: 0, totalRequests: 0, successRate: 100 },
].filter(config => config.key && config.key !== 'undefined');

// Intelligent Model Registry
const MODEL_REGISTRY: ModelConfig[] = [
  { name: 'gemini-2.0-flash-exp', tier: 'balanced', reliability: 95, avgLatency: 1200, quotaPool: 'gemini' },
  { name: 'gemini-1.5-flash-8b', tier: 'fast', reliability: 94, avgLatency: 800, quotaPool: 'gemini' },
  { name: 'gemini-flash-latest', tier: 'balanced', reliability: 96, avgLatency: 1100, quotaPool: 'gemini' },
  { name: 'gemma-2-27b-it', tier: 'quality', reliability: 98, avgLatency: 2000, quotaPool: 'gemma' },
];

// Circuit Breaker for Fault Tolerance
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(private threshold = 5, private timeout = 60000) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
  
  getState() { return this.state; }
}

// Intelligent Load Balancer
class IntelligentLoadBalancer {
  private circuitBreakers = new Map<string, CircuitBreaker>();
  
  constructor() {
    API_KEY_POOL.forEach(config => {
      this.circuitBreakers.set(config.key, new CircuitBreaker());
    });
  }
  
  selectOptimalKey(): ApiKeyConfig | null {
    const availableKeys = API_KEY_POOL
      .filter(config => {
        const breaker = this.circuitBreakers.get(config.key);
        return breaker?.getState() !== 'OPEN' && config.healthScore > 20;
      })
      .sort((a, b) => {
        const scoreA = (a.healthScore * 0.4) + (a.successRate * 0.3) + ((100 - a.priority) * 0.3);
        const scoreB = (b.healthScore * 0.4) + (b.successRate * 0.3) + ((100 - b.priority) * 0.3);
        return scoreB - scoreA;
      });
    
    return availableKeys[0] || API_KEY_POOL[0] || null;
  }
  
  selectOptimalModel(complexity: 'low' | 'medium' | 'high'): ModelConfig {
    if (complexity === 'high') {
      return MODEL_REGISTRY.find(m => m.tier === 'quality') || MODEL_REGISTRY[0];
    }
    return MODEL_REGISTRY.find(m => m.tier === 'balanced') || MODEL_REGISTRY[0];
  }

  getBreaker(key: string) { return this.circuitBreakers.get(key); }
  
  recordSuccess(keyConfig: ApiKeyConfig) {
    keyConfig.lastUsed = Date.now();
    keyConfig.totalRequests++;
    keyConfig.healthScore = Math.min(keyConfig.healthScore + 2, 100);
  }
  
  recordFailure(keyConfig: ApiKeyConfig) {
    keyConfig.consecutiveFailures++;
    keyConfig.healthScore = Math.max(keyConfig.healthScore - 10, 0);
  }
}

const loadBalancer = new IntelligentLoadBalancer();

// Zod Schema for Structured Intelligence
const CommandSchema = z.object({
  action: z.enum(['flyTo', 'filter', 'reset', 'tool']).describe('The primary action to execute'),
  targetState: z.string().optional().describe('Normalized state name'),
  targetDistrict: z.string().optional().describe('Normalized district name'),
  metric: z.enum(['screened', 'yield', 'breaches']).optional().describe('KPI to highlight'),
  aiMessage: z.string().describe('Sonic spoken response (highly energetic, emojis)'),
  presentationCue: z.enum(['intro', 'midpoint', 'outro']).nullable().describe('Visual animation: midpoint for breaches, outro for success'),
  visualInsights: z.array(z.object({
    label: z.string().describe('Metric name'),
    value: z.number().describe('Current value'),
    target: z.number().describe('Target value'),
    trend: z.enum(['up', 'down', 'stable']).describe('Trend direction'),
    unit: z.string().describe('Unit of measurement')
  })).optional().describe('Live metrics for TV display'),
  chartData: z.array(z.object({
    x: z.string().describe('District or category'),
    y: z.number().describe('Value')
  })).optional().describe('Top 10 districts for bar chart'),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { prompt, context } = await req.json();
    const startTime = Date.now();

    // 1. SELECT KEY & MODEL
    const selectedKey = loadBalancer.selectOptimalKey();
    if (!selectedKey) throw new Error('No API keys available');
    
    const complexity = prompt.length > 50 ? 'high' : 'medium';
    const selectedModel = loadBalancer.selectOptimalModel(complexity);
    
    // 2. BUILD CONTEXT
    const allDistricts = context.districtData || [];
    const totalBreaches = allDistricts.reduce((s:number, d:any) => s + (d.breachCount || 0), 0);

    const contextString = `
      USER_PROMPT: ${prompt}
      CURRENT_VIEW: ${context.lookingAt || 'India'}
      STATS: Total breaches across India: ${totalBreaches}. 
      DATA_SLICE (TOP 10): ${JSON.stringify(allDistricts.slice(0, 10))}
    `;

    const SYSTEM_PROMPT = `You are SONIC AI. Hyper-energetic, cinematic assistant for TB Programme Analytics. PRESENTATION PROTOCOL: Use midpoint if breaches are high (trigger Red Columns animation). Use outro if data is perfect. Use intro for new searches. VISUALIZATION: Generate 4 key metrics with value, target, trend, unit. Generate chartData with top 10 districts. TONE: Respectful but high-speed. Sir is mandatory. Use emojis. RESPONSE: JSON ONLY.`;

    // 3. EXECUTE WITH FAULT TOLERANCE
    const breaker = loadBalancer.getBreaker(selectedKey.key)!;
    const result = await breaker.execute(async () => {
      const google = createGoogleGenerativeAI({ apiKey: selectedKey.key });
      const { object } = await generateObject({
        model: google(selectedModel.name),
        system: SYSTEM_PROMPT,
        prompt: contextString,
        schema: CommandSchema,
      });
      return object;
    });

    loadBalancer.recordSuccess(selectedKey);
    console.log(`✅ [${Date.now() - startTime}ms] Sonic Response via ${selectedModel.name}`);

    return NextResponse.json({ success: true, command: result });

  } catch (error: any) {
    console.error('❌ AI Gateway Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Sonic AI Gateway Active', healthy: API_KEY_POOL.length > 0 });
}