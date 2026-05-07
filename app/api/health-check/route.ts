import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const diagnostic: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercel: {
      url: process.env.VERCEL_URL,
      region: process.env.VERCEL_REGION,
    },
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/\/.*@/, '//***:***@') || 'MISSING',
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    tests: {}
  };

  try {
    // Test 1: Basic Supabase connectivity
    console.log('[health-check] Testing Supabase connectivity...');
    const supabase = getSupabaseClient();
    
    const { data: testData, error: testError } = await supabase
      .from('patients')
      .select('id, inmate_name')
      .limit(1)
      .maybeSingle();

    diagnostic.tests.connectivity = {
      success: !testError,
      error: testError?.message || null,
      code: testError?.code || null,
      duration: Date.now() - startTime
    };

    if (testError) {
      diagnostic.status = 'UNHEALTHY';
      diagnostic.overall = 'Supabase connection failed';
      return NextResponse.json(diagnostic, { status: 503 });
    }

    // Test 2: Database write permissions
    console.log('[health-check] Testing database permissions...');
    if (testData) {
      const { error: updateError } = await supabase
        .from('patients')
        .update({ contact_number: `health-check-${Date.now()}` })
        .eq('id', testData.id)
        .select('id')
        .single();

      diagnostic.tests.writePermissions = {
        success: !updateError,
        error: updateError?.message || null,
        code: updateError?.code || null,
        testPatientId: testData.id
      };

      if (updateError) {
        diagnostic.status = 'DEGRADED';
        diagnostic.overall = 'Read OK, write permissions failed';
      } else {
        diagnostic.status = 'HEALTHY';
        diagnostic.overall = 'All systems operational';
      }
    } else {
      diagnostic.tests.writePermissions = {
        success: null,
        error: 'No patients found to test write permissions',
        code: 'NO_TEST_DATA'
      };
      diagnostic.status = 'DEGRADED';
      diagnostic.overall = 'Read OK, cannot test write permissions';
    }

    diagnostic.totalDuration = Date.now() - startTime;
    
    return NextResponse.json(diagnostic, { 
      status: diagnostic.status === 'HEALTHY' ? 200 : 
             diagnostic.status === 'DEGRADED' ? 200 : 503 
    });

  } catch (error: any) {
    console.error('[health-check] Unexpected error:', error);
    diagnostic.status = 'UNHEALTHY';
    diagnostic.overall = 'Critical system error';
    diagnostic.unexpectedError = {
      message: error.message,
      name: error.constructor.name,
      stack: error.stack?.split('\n').slice(0, 3) // First 3 lines only
    };
    
    return NextResponse.json(diagnostic, { status: 500 });
  }
}
