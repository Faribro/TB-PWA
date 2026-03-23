import { NextRequest, NextResponse } from 'next/server';
import { analyzeDistrictWithGemini } from '@/lib/geminiMapAnalyzer';
import { sanitizeForAI, validateSanitization } from '@/utils/dataSanitizer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, district, allDistricts } = body;

    if (!district) {
      return NextResponse.json(
        { error: 'District data required' },
        { status: 400 }
      );
    }

    // PII Shield: Sanitize data before sending to AI
    const sanitizedDistrict = sanitizeForAI(district);
    const sanitizedAllDistricts = sanitizeForAI(allDistricts || [district]);

    // Validate sanitization
    const validation = validateSanitization({
      district: sanitizedDistrict,
      allDistricts: sanitizedAllDistricts
    });

    if (!validation.valid) {
      // CRITICAL: PII leak prevented

      console.error('❌ PII Shield: Sanitization failed', validation.violations);
      return NextResponse.json(
        { error: 'Data sanitization failed' },
        { status: 400 }
      );
    }

    const context = {
      command,
      districtData: sanitizedAllDistricts,
      selectedDistrict: sanitizedDistrict.district,
      activeMetric: 'breaches'
    };

    const analysis = await analyzeDistrictWithGemini(context);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('District analysis error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}
