/**
 * lib/ai/openRouterMatcher.ts
 *
 * OpenRouter AI integration for enhanced patient matching.
 * Used when rule-based scoring is ambiguous (40-60% confidence).
 *
 * Use cases:
 * - Name normalization (spelling variations, transliterations)
 * - Fuzzy matching for edge cases
 * - Confidence scoring for ambiguous cases
 */

import { callOpenRouter } from '../openrouter';

export interface AIMatchRequest {
  extractedName: string;
  extractedFatherName?: string | null;
  extractedAge?: number | null;
  extractedMobile?: string | null;
  extractedFacility?: string | null;
  
  candidateName: string;
  candidateFatherName?: string | null;
  candidateAge?: number | null;
  candidateMobile?: string | null;
  candidateFacility?: string | null;
}

export interface AIMatchResponse {
  isMatch: boolean;
  confidence: number; // 0-1
  reasons: string[];
  normalizedExtractedName?: string;
  normalizedCandidateName?: string;
}

export interface AINormalizeRequest {
  name: string;
  fatherName?: string | null;
}

export interface AINormalizeResponse {
  normalizedName: string;
  normalizedFatherName?: string;
  variations: string[];
}

export interface BatchAIMatchRequest {
  matches: Array<{
    extractedName: string;
    extractedFatherName?: string | null;
    extractedAge?: number | null;
    extractedMobile?: string | null;
    extractedFacility?: string | null;
    candidateName: string;
    candidateFatherName?: string | null;
    candidateAge?: number | null;
    candidateMobile?: string | null;
    candidateFacility?: string | null;
  }>;
}

export interface BatchAIMatchResponse {
  results: Array<{
    isMatch: boolean;
    confidence: number;
    reasons: string[];
  }>;
}

interface AIUsageLog {
  endpoint: string;
  modelUsed: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  requestDurationMs: number;
  success: boolean;
  errorMessage?: string;
  batchSize?: number;
  itemsProcessed?: number;
  context?: {
    sessionId?: string;
    userEmail?: string;
    screeningDate?: string;
    screeningState?: string;
    screeningDistrict?: string;
    facilityName?: string;
  };
}

/**
 * Call OpenRouter AI for batch matching decisions
 * More efficient than individual calls for multiple rows
 */
export async function callOpenRouterBatchMatch(
  request: BatchAIMatchRequest,
  context?: {
    sessionId?: string;
    userEmail?: string;
    screeningDate?: string;
    screeningState?: string;
    screeningDistrict?: string;
    facilityName?: string;
  },
): Promise<BatchAIMatchResponse> {
  const startTime = Date.now();
  const matchDescriptions = request.matches.map((m, i) => `
Match ${i + 1}:
Extracted: ${m.extractedName} (Father: ${m.extractedFatherName || 'N/A'}, Age: ${m.extractedAge || 'N/A'}, Mobile: ${m.extractedMobile || 'N/A'}, Facility: ${m.extractedFacility || 'N/A'})
Candidate: ${m.candidateName} (Father: ${m.candidateFatherName || 'N/A'}, Age: ${m.candidateAge || 'N/A'}, Mobile: ${m.candidateMobile || 'N/A'}, Facility: ${m.candidateFacility || 'N/A'})
`).join('\n');

  const prompt = `You are a patient record matching expert. Determine if each pair of patient records represent the same person.

${matchDescriptions}

Respond with JSON array:
[
  {
    "isMatch": boolean,
    "confidence": number (0-1),
    "reasons": ["reason1", "reason2"]
  }
]

Consider:
- Name spelling variations and transliterations
- Age proximity (±5 years acceptable)
- Mobile number matching (exact or last 10 digits)
- Father's name matching
- Facility matching
- Cultural naming conventions (Indian context)`;

  try {
    const content = await callOpenRouter({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a patient record matching expert. Always respond with valid JSON array.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const duration = Date.now() - startTime;

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in OpenRouter response');
    }

    const results = JSON.parse(jsonMatch[0]);
    
    // Log usage asynchronously
    logAIUsage({
      endpoint: 'batch_match',
      modelUsed: 'gpt-4o-mini',
      requestDurationMs: duration,
      success: true,
      batchSize: request.matches.length,
      itemsProcessed: results.length,
      context,
    }).catch(err => console.error('[AI Usage] Failed to log:', err));
    
    return {
      results: results.map((r: any) => ({
        isMatch: r.isMatch || false,
        confidence: r.confidence || 0,
        reasons: r.reasons || [],
      })),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log failed usage
    logAIUsage({
      endpoint: 'batch_match',
      modelUsed: 'gpt-4o-mini',
      requestDurationMs: duration,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      batchSize: request.matches.length,
      itemsProcessed: 0,
      context,
    }).catch(err => console.error('[AI Usage] Failed to log:', err));
    
    console.error('[OpenRouterMatcher] Batch error:', error);
    throw error;
  }
}

/**
 * Call OpenRouter AI for matching decision
 */
export async function callOpenRouterMatch(
  request: AIMatchRequest,
): Promise<AIMatchResponse> {
  const prompt = `You are a patient record matching expert. Determine if two patient records represent the same person.

Extracted Record:
- Name: ${request.extractedName}
- Father's Name: ${request.extractedFatherName || 'N/A'}
- Age: ${request.extractedAge || 'N/A'}
- Mobile: ${request.extractedMobile || 'N/A'}
- Facility: ${request.extractedFacility || 'N/A'}

Candidate Record:
- Name: ${request.candidateName}
- Father's Name: ${request.candidateFatherName || 'N/A'}
- Age: ${request.candidateAge || 'N/A'}
- Mobile: ${request.candidateMobile || 'N/A'}
- Facility: ${request.candidateFacility || 'N/A'}

Respond with JSON:
{
  "isMatch": boolean,
  "confidence": number (0-1),
  "reasons": ["reason1", "reason2"],
  "normalizedExtractedName": "normalized name",
  "normalizedCandidateName": "normalized name"
}

Consider:
- Name spelling variations and transliterations
- Age proximity (±5 years acceptable)
- Mobile number matching (exact or last 10 digits)
- Father's name matching
- Facility matching
- Cultural naming conventions (Indian context)`;

  try {
    const content = await callOpenRouter({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a patient record matching expert. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in OpenRouter response');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    return {
      isMatch: result.isMatch || false,
      confidence: result.confidence || 0,
      reasons: result.reasons || [],
      normalizedExtractedName: result.normalizedExtractedName,
      normalizedCandidateName: result.normalizedCandidateName,
    };
  } catch (error) {
    console.error('[OpenRouterMatcher] Error:', error);
    throw error;
  }
}

/**
 * Call OpenRouter AI for name normalization
 */
export async function callOpenRouterNormalize(
  request: AINormalizeRequest,
): Promise<AINormalizeResponse> {
  const prompt = `Normalize this Indian name for patient matching.

Name: ${request.name}
Father's Name: ${request.fatherName || 'N/A'}

Respond with JSON:
{
  "normalizedName": "normalized name (uppercase, no extra spaces)",
  "normalizedFatherName": "normalized father name (if provided)",
  "variations": ["variation1", "variation2"]
}

Consider:
- Common spelling variations
- Transliteration patterns
- Remove honorifics (Shri, Smt, etc.)
- Standardize to uppercase
- Remove extra spaces`;

  try {
    const content = await callOpenRouter({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a name normalization expert for Indian patient records. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 300,
    });

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in OpenRouter response');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    return {
      normalizedName: result.normalizedName || request.name.toUpperCase(),
      normalizedFatherName: result.normalizedFatherName,
      variations: result.variations || [],
    };
  } catch (error) {
    console.error('[OpenRouterMatcher] Error:', error);
    throw error;
  }
}

/**
 * Log AI usage to database for cost monitoring and analytics
 */
async function logAIUsage(log: AIUsageLog): Promise<void> {
  const { getSupabaseClient } = await import('@/lib/supabase-server');
  const supabase = getSupabaseClient();
  
  // Calculate estimated cost
  const estimatedCost = calculateCost(log.modelUsed, log.inputTokens || 0, log.outputTokens || 0);
  
  await supabase.from('ai_usage').insert({
    endpoint: log.endpoint,
    model_used: log.modelUsed,
    input_tokens: log.inputTokens,
    output_tokens: log.outputTokens,
    total_tokens: log.totalTokens,
    estimated_cost_usd: estimatedCost,
    session_id: log.context?.sessionId,
    user_email: log.context?.userEmail,
    screening_date: log.context?.screeningDate,
    screening_state: log.context?.screeningState,
    screening_district: log.context?.screeningDistrict,
    facility_name: log.context?.facilityName,
    request_duration_ms: log.requestDurationMs,
    success: log.success,
    error_message: log.errorMessage,
    batch_size: log.batchSize,
    items_processed: log.itemsProcessed,
  });
}

/**
 * Calculate estimated cost based on model and tokens
 */
function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  // gpt-4o-mini pricing (as of 2024)
  // Input: $0.15 / 1M tokens
  // Output: $0.60 / 1M tokens
  if (model === 'gpt-4o-mini') {
    return (inputTokens * 0.15 / 1000000) + (outputTokens * 0.60 / 1000000);
  }
  
  // gpt-4o pricing (as of 2024)
  // Input: $2.50 / 1M tokens
  // Output: $10.00 / 1M tokens
  if (model === 'gpt-4o') {
    return (inputTokens * 2.50 / 1000000) + (outputTokens * 10.00 / 1000000);
  }
  
  return 0;
}
