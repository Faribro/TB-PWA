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

    if (!patientId || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields: patientId and updates' },
        { status: 400 }
      );
    }

    // Step A: Update Supabase
    const { data: supabaseData, error: supabaseError } = await supabase
      .from('patients')
      .update({
        inmate_name: updates.inmate_name,
        age: updates.age,
        sex: updates.sex,
        contact_number: updates.contact_number,
        address: updates.address,
        facility_name: updates.facility_name,
        dob: updates.dob,
        screening_date: updates.screening_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', patientId)
      .select()
      .single();

    if (supabaseError) {
      console.error('Supabase update failed:', supabaseError);
      return NextResponse.json(
        { error: 'Failed to update Supabase', details: supabaseError.message },
        { status: 500 }
      );
    }

    // Step B: Forward to Google Apps Script (with timeout handling)
    let googleSheetsResult: { success: boolean; message: string; data?: any } = { 
      success: false, 
      message: 'Webhook not configured' 
    };
    
    if (GOOGLE_SCRIPT_URL && koboUuid) {
      try {
        const webhookPayload = {
          action: 'update_demographics',
          uuid: koboUuid,
          updates: {
            inmate_name: updates.inmate_name,
            age: updates.age,
            sex: updates.sex,
            contact_number: updates.contact_number,
            address: updates.address,
            facility_name: updates.facility_name,
            dob: updates.dob,
            screening_date: updates.screening_date
          }
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
      message: 'Patient demographics updated',
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
