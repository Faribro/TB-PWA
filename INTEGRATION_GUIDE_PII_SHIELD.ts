/**
 * INTEGRATION GUIDE: PII Shield in API Routes
 * 
 * This guide shows how to integrate the dataSanitizer utility
 * into your API routes to prevent PII leakage to AI services.
 */

// ============================================================================
// EXAMPLE 1: Vector Engine API Route
// File: app/api/vector-engine/route.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { sanitizeForAI, validateSanitization } from '@/utils/dataSanitizer';

export async function POST(request: NextRequest) {
  try {
    const { districtData, query } = await request.json();
    
    // STEP 1: Sanitize data before sending to AI
    const sanitizedData = sanitizeForAI(districtData);
    
    // STEP 2: Validate sanitization (optional but recommended)
    const validation = validateSanitization(sanitizedData);
    if (!validation.valid) {
      console.error('[PII Shield] Validation failed:', validation.violations);
      return NextResponse.json(
        { error: 'Data sanitization failed' },
        { status: 500 }
      );
    }
    
    // STEP 3: Send sanitized data to Gemini API
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Analyze this district data: ${JSON.stringify(sanitizedData)}. Query: ${query}`
          }]
        }]
      })
    });
    
    const result = await response.json();
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[Vector Engine] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// EXAMPLE 2: AI Command API Route
// File: app/api/ai/command/route.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { sanitizeDistrictData, sanitizePatientData } from '@/utils/dataSanitizer';

export async function POST(request: NextRequest) {
  try {
    const { prompt, context } = await request.json();
    
    // Sanitize different data types appropriately
    const sanitizedContext = {
      districtData: context.districtData 
        ? sanitizeDistrictData(context.districtData) 
        : [],
      lookingAt: context.lookingAt, // Safe - just a route path
      activeFilters: {
        // Only include non-PII filter values
        state: context.activeFilters?.state,
        district: context.activeFilters?.district,
        phase: context.activeFilters?.phase,
      }
    };
    
    // Send to AI with sanitized context
    const aiResponse = await callGeminiAPI(prompt, sanitizedContext);
    
    return NextResponse.json({ command: aiResponse });
    
  } catch (error) {
    console.error('[AI Command] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process command' },
      { status: 500 }
    );
  }
}

// ============================================================================
// EXAMPLE 3: District Analysis API Route
// File: app/api/analyze-district/route.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { sanitizePatientData, logSanitizationMetrics } from '@/utils/dataSanitizer';

export async function POST(request: NextRequest) {
  try {
    const { command, district, allDistricts } = await request.json();
    
    // Count original fields for metrics
    const originalSize = JSON.stringify(district).length;
    
    // Sanitize district data
    const sanitizedDistrict = {
      district: district.district,
      state: district.state,
      screened: district.screened,
      diagnosed: district.diagnosed,
      breachCount: district.breachCount,
      breachRate: district.breachRate,
    };
    
    const sanitizedSize = JSON.stringify(sanitizedDistrict).length;
    
    // Log metrics for monitoring
    logSanitizationMetrics(originalSize, sanitizedSize, 'district-analysis');
    
    // Send to AI
    const analysis = await analyzeWithGemini(command, sanitizedDistrict);
    
    return NextResponse.json(analysis);
    
  } catch (error) {
    console.error('[District Analysis] Error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}

// ============================================================================
// BEST PRACTICES
// ============================================================================

/**
 * 1. ALWAYS sanitize before sending to external APIs
 * 2. Use validateSanitization() in development to catch leaks
 * 3. Log sanitization metrics for monitoring
 * 4. Never log unsanitized data in production
 * 5. Use specific sanitizers (sanitizeDistrictData, sanitizePatientData) 
 *    when you know the data type for better performance
 */

// ============================================================================
// TESTING SANITIZATION
// ============================================================================

/**
 * Test your sanitization in development:
 * 
 * import { sanitizeForAI, validateSanitization } from '@/utils/dataSanitizer';
 * 
 * const testData = {
 *   inmate_name: 'John Doe', // PII - should be removed
 *   district: 'Mumbai',      // Safe - should be kept
 *   screened: 100,           // Safe - should be kept
 * };
 * 
 * const sanitized = sanitizeForAI(testData);
 * console.log(sanitized); // { district: 'Mumbai', screened: 100 }
 * 
 * const validation = validateSanitization(sanitized);
 * console.log(validation); // { valid: true, violations: [] }
 */
