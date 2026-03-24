import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Google Apps Script Web App URL (set this in your .env.local)
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_WEBHOOK_URL || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, koboUuid, updates } = body;

    console.log('[patient-sync] Request received:', { patientId, koboUuid, updateKeys: Object.keys(updates) });

    if (!patientId || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields: patientId and updates' },
        { status: 400 }
      );
    }

    // Step A: Update Supabase (handle all fields dynamically)
    const supabaseUpdates: any = {};

    // Map form fields to database columns (using ACTUAL Supabase column names)
    const fieldMapping: Record<string, string> = {
      'inmate_name': 'inmate_name',
      'age': 'age',
      'sex': 'sex',
      'contact_number': 'contact_number',
      'address': 'address',
      'facility_name': 'facility_name',
      'dob': 'date_of_birth',
      'screening_date': 'screening_date',
      'Date of referral for TB Examination (sputum) (dd/mm/yy)': 'referral_date',
      'Name of facility where referred to (Give code/name of all facilities)': 'referred_facility',
      'TB diagnosed (Y/N)': 'tb_diagnosed',
      'Date of TB Diagnosed (dd/mm/yy)': 'tb_diagnosis_date',
      'Type of TB Diagnosed (P/EP)': 'tb_type',
      'Date of starting ATT (dd/mm/yyyy)': 'att_start_date',
      'Date of Treatment Completion (dd/mm/yyyy)': 'att_completion_date',
      'HIV Status (Positive/Negative/Unknown)': 'hiv_status',
      'Status at the time of referral (Pre ART/On ART)': 'art_status',
      'ART Number': 'art_number',
      'NIKSHAY/ABHA ID': 'nikshay_abha_id',
      'Date of registration (dd/mm/yyyy)': 'registration_date',
      'Remarks': 'remarks',
      'closure_reason': 'closure_reason'
    };

    // Map updates to database columns
    Object.keys(updates).forEach(key => {
      const dbColumn = fieldMapping[key] || key;
      if (updates[key] !== undefined && updates[key] !== null && updates[key] !== '') {
        supabaseUpdates[dbColumn] = updates[key];
      }
    });

    console.log('[patient-sync] Supabase updates:', supabaseUpdates);

    const { data: supabaseData, error: supabaseError } = await supabase
      .from('patients')
      .update(supabaseUpdates)
      .eq('id', patientId)
      .select()
      .single();

    if (supabaseError) {
      console.error('[patient-sync] Supabase error:', supabaseError);
      return NextResponse.json(
        { error: 'Failed to update Supabase', details: supabaseError.message },
        { status: 500 }
      );
    }

    console.log('[patient-sync] Supabase success, updated patient:', supabaseData?.id);

    // Step B: Forward to Google Apps Script (with timeout handling)
    let googleSheetsResult: { success: boolean; message: string; data?: any } = { 
      success: false, 
      message: 'Webhook not configured' 
    };
    
    if (GOOGLE_SCRIPT_URL && koboUuid) {
      try {
        const webhookPayload = {
          action: 'update_patient',
          uuid: koboUuid,
          updates: updates
        };

        const webhookResponse = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (webhookResponse.ok) {
          const webhookData = await webhookResponse.json();
          googleSheetsResult = {
            success: true,
            message: 'Google Sheets updated successfully',
            data: webhookData
          };
        } else {
          googleSheetsResult = {
            success: false,
            message: `Webhook returned status ${webhookResponse.status}`
          };
        }
      } catch (webhookError: any) {
        console.error('Google Sheets webhook failed:', webhookError);
        googleSheetsResult = {
          success: false,
          message: webhookError.name === 'TimeoutError' 
            ? 'Webhook timeout (Google Sheets may still update)' 
            : `Webhook error: ${webhookError.message}`
        };
      }
    }

    // Return success even if webhook fails (Supabase is the source of truth)
    return NextResponse.json({
      success: true,
      message: 'Patient data updated',
      supabase: {
        success: true,
        data: supabaseData
      },
      googleSheets: googleSheetsResult
    });

  } catch (error: any) {
    console.error('Patient sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
