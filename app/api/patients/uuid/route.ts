import { NextRequest, NextResponse } from 'next/server';
import { getPatientByUuid } from '@/lib/data/get-patient';
import { validateAndExtractScope } from '@/lib/api/patients-scope';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const scope = await validateAndExtractScope();
    
    const { searchParams } = new URL(request.url);
    const uuid = searchParams.get('uuid');
    
    if (!uuid) {
      return NextResponse.json(
        { error: 'UUID parameter is required' },
        { status: 400 }
      );
    }

    const patient = await getPatientByUuid(uuid);

    // RBAC check
    if (!scope.isNational && scope.sessionState && scope.sessionState !== 'All') {
      const patientState = patient.screening_state;
      if (patientState !== scope.sessionState) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    const durationMs = Date.now() - startTime;

    return NextResponse.json(
      { 
        data: patient,
        meta: { durationMs, fetchedBy: 'uuid' }
      },
      { 
        status: 200,
        headers: {
          'X-Duration-Ms': String(durationMs),
          'Cache-Control': 'private, max-age=30'
        }
      }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message === 'Patient not found') {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
