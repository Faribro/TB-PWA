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

/**
 * Call OpenRouter AI for matching decision
 */
export async function callOpenRouterMatch(
  request: AIMatchRequest,
): Promise<AIMatchResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

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
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // Cost-effective model
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
        temperature: 0.1, // Low temperature for consistent results
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenRouter response');
    }

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
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

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
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
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
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenRouter response');
    }

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
