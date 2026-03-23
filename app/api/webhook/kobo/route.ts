import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/webhook/kobo
 * Receives webhook data from KoboToolbox and inserts into Supabase
 * 
 * Security: Validates x-kobo-webhook-secret header
 * Returns: 200 on success, 401 on auth failure, 500 on processing error
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: AUTHENTICATION - Validate webhook secret
    // ═══════════════════════════════════════════════════════════════════════
    const secret = req.headers.get('x-kobo-webhook-secret');
    const expectedSecret = process.env.KOBO_WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.error('❌ KOBO_WEBHOOK_SECRET not configured in environment');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (!secret || secret !== expectedSecret) {
      console.warn('⚠️ Unauthorized webhook attempt:', {
        receivedSecret: secret ? '***' : 'missing',
        timestamp: new Date().toISOString(),
        ip: req.headers.get('x-forwarded-for') || 'unknown'
      });
      
      return NextResponse.json(
        { error: 'Unauthorized - Invalid webhook secret' },
        { status: 401 }
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: PARSE PAYLOAD - Extract Kobo submission data
    // ═══════════════════════════════════════════════════════════════════════
    let payload: any;
    
    try {
      payload = await req.json();
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Validate required fields
    const uuid = payload._uuid || payload.uuid;
    if (!uuid) {
      console.error('❌ Missing required field: _uuid');
      return NextResponse.json(
        { error: 'Missing required field: _uuid' },
        { status: 400 }
      );
    }

    console.log('📥 Webhook received:', {
      uuid: uuid.substring(0, 12) + '...',
      timestamp: new Date().toISOString(),
      fields: Object.keys(payload).length
    });

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: TRANSFORM DATA - Map Kobo fields to Supabase schema
    // ═══════════════════════════════════════════════════════════════════════
    const transformedData = transformKoboPayload(payload);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: UPSERT TO SUPABASE - Insert or update patient record
    // ═══════════════════════════════════════════════════════════════════════
    const { data, error } = await supabase
      .from('patients')
      .upsert(transformedData, {
        onConflict: 'kobo_uuid',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('❌ Supabase upsert error:', error);
      return NextResponse.json(
        { error: 'Database operation failed', details: error.message },
        { status: 500 }
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 5: SUCCESS RESPONSE
    // ═══════════════════════════════════════════════════════════════════════
    const processingTime = Date.now() - startTime;
    
    console.log('✅ Webhook processed successfully:', {
      uuid: uuid.substring(0, 12) + '...',
      processingTime: `${processingTime}ms`,
      recordsAffected: data?.length || 0
    });

    return NextResponse.json({
      success: true,
      message: 'Data processed successfully',
      uuid: uuid,
      processingTime: `${processingTime}ms`,
      recordsAffected: data?.length || 0
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Webhook processing error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Transform Kobo payload to Supabase schema
 * Maps Kobo field names to database columns
 */
function transformKoboPayload(payload: any) {
  // Helper function to safely extract nested fields
  const getField = (obj: any, keys: string[]) => {
    for (const key of keys) {
      if (obj[key] !== undefined) return obj[key];
    }
    return null;
  };

  // Extract GPS coordinates
  const geo = payload._geolocation || [];
  const latitude = geo[0] ? parseFloat(geo[0]) : null;
  const longitude = geo[1] ? parseFloat(geo[1]) : null;

  // Transform date format (YYYY-MM-DD to ISO)
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toISOString();
    } catch {
      return null;
    }
  };

  return {
    // Identifiers
    kobo_uuid: payload._uuid || payload.uuid,
    kobo_id: payload._id || payload.id,
    
    // Staff & Submission Info
    staff_name: getField(payload, [
      'grp_screening/staff_name',
      'staff_name',
      'grp_screening/Name_of_the_Staff',
      'Name_of_the_Staff'
    ]),
    submitted_on: payload._submission_time || new Date().toISOString(),
    
    // Location
    screening_state: getField(payload, [
      'grp_screening/screening_state',
      'screening_state',
      'grp_screening/State',
      'State'
    ]),
    screening_district: getField(payload, [
      'grp_screening/screening_district',
      'screening_district',
      'grp_screening/District',
      'District'
    ]),
    
    // Facility
    facility_name: getField(payload, [
      'grp_screening/facility_code',
      'facility_code',
      'grp_screening/facility_name',
      'facility_name'
    ]),
    facility_type: getField(payload, [
      'grp_screening/facility_type',
      'facility_type',
      'grp_screening/Facility_type',
      'Facility_type'
    ]),
    
    // Screening
    screening_date: formatDate(getField(payload, [
      'grp_screening/screening_date',
      'screening_date',
      'grp_screening/Date_of_Screening_CH_x_ray_dd_mm_yy',
      'Date_of_Screening_CH_x_ray_dd_mm_yy'
    ])),
    
    // Patient Identity
    inmate_name: getField(payload, [
      'grp_identity/inmate_name',
      'inmate_name',
      'grp_identity/Inmate_Name',
      'Inmate_Name'
    ]),
    inmate_type: getField(payload, [
      'grp_identity/inmate_type',
      'inmate_type',
      'grp_identity/Inmate_type_Under_Trial_Convicted_Other',
      'Inmate_type_Under_Trial_Convicted_Other'
    ]),
    father_husband_name: getField(payload, [
      'grp_identity/father_husband_name',
      'father_husband_name',
      'grp_identity/Father_Husband_s_Name',
      'Father_Husband_s_Name'
    ]),
    
    // Demographics
    date_of_birth: formatDate(getField(payload, [
      'grp_demo/date_of_birth',
      'date_of_birth',
      'grp_demo/Date_of_Birth',
      'Date_of_Birth'
    ])),
    age: getField(payload, ['grp_demo/age', 'age']),
    sex: getField(payload, [
      'grp_demo/sex',
      'sex',
      'grp_demo/Sex_Male_Female_TG',
      'Sex_Male_Female_TG'
    ]),
    contact_number: getField(payload, [
      'grp_demo/contact_number',
      'contact_number',
      'grp_demo/Contact_Number',
      'Contact_Number'
    ]),
    
    // Address
    address: [
      getField(payload, ['grp_address/address_block_house', 'address_block_house']),
      getField(payload, ['grp_address/address_street', 'address_street']),
      getField(payload, ['grp_address/address_city', 'address_city']),
      getField(payload, ['grp_address/address_district', 'address_district']),
      getField(payload, ['grp_address/address_state', 'address_state']),
      getField(payload, ['grp_address/address_pin_code', 'address_pin_code'])
    ].filter(Boolean).join(', '),
    
    // TB Screening
    xray_result: getField(payload, [
      'grp_tb/xray_result',
      'xray_result',
      'grp_tb/Chest_x_ray_Result_Active_Lat',
      'Chest_x_ray_Result_Active_Lat'
    ]),
    symptoms_10s: getField(payload, [
      'grp_tb/symptoms_10s',
      'symptoms_10s',
      'grp_tb/_10s_Symptoms_Present_You_can',
      '_10s_Symptoms_Present_You_can'
    ]),
    tb_past_history: getField(payload, [
      'grp_tb/tb_past_history',
      'tb_past_history',
      'grp_tb/Whether_any_past_history_of_TB_Y_N',
      'Whether_any_past_history_of_TB_Y_N'
    ]),
    
    // Referral & Diagnosis
    referral_date: formatDate(getField(payload, [
      'grp_referral/referral_date',
      'referral_date',
      'grp_referral/Date_of_referral_for_ion_sputum_dd_mm_yy',
      'Date_of_referral_for_ion_sputum_dd_mm_yy'
    ])),
    referred_facility: getField(payload, [
      'grp_referral/referred_facility',
      'referred_facility'
    ]),
    tb_diagnosed: getField(payload, [
      'grp_referral/tb_diagnosed',
      'tb_diagnosed',
      'grp_referral/TB_diagnosed',
      'TB_diagnosed'
    ]),
    tb_diagnosis_date: formatDate(getField(payload, [
      'grp_referral/tb_diagnosis_date',
      'tb_diagnosis_date'
    ])),
    tb_type: getField(payload, [
      'grp_referral/tb_type',
      'tb_type',
      'grp_referral/Type_of_TB_Diagnosed_P_EP',
      'Type_of_TB_Diagnosed_P_EP'
    ]),
    
    // Treatment
    att_start_date: formatDate(getField(payload, [
      'grp_referral/att_start_date',
      'att_start_date'
    ])),
    att_completion_date: formatDate(getField(payload, [
      'grp_referral/att_completion_date',
      'att_completion_date'
    ])),
    
    // HIV Status
    hiv_status: getField(payload, [
      'grp_hiv/hiv_status',
      'hiv_status',
      'grp_hiv/HIV_Status_Positive_Negative_',
      'HIV_Status_Positive_Negative_'
    ]),
    art_status: getField(payload, [
      'grp_hiv/art_status_at_referral',
      'art_status_at_referral'
    ]),
    art_number: getField(payload, [
      'grp_hiv/art_number',
      'art_number'
    ]),
    
    // Registration
    nikshay_abha_id: getField(payload, [
      'grp_reg/nikshay_abha_id',
      'nikshay_abha_id',
      'grp_reg/NIKSHAY_ABHA_ID',
      'NIKSHAY_ABHA_ID'
    ]),
    registration_date: formatDate(getField(payload, [
      'grp_reg/nikshay_registration_date',
      'nikshay_registration_date'
    ])),
    
    // Additional
    remarks: getField(payload, [
      'grp_reg/remarks',
      'remarks',
      'grp_reg/Remarks',
      'Remarks'
    ]),
    serial_number: getField(payload, [
      'grp_screening/Serial_Number',
      'Serial_Number',
      'grp_screening/SERIAL_NUMBER',
      'SERIAL_NUMBER'
    ]),
    
    // GPS
    latitude,
    longitude,
    
    // Metadata
    created_at: new Date().toISOString()
  };
}

/**
 * GET handler - Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/webhook/kobo',
    method: 'POST',
    authentication: 'x-kobo-webhook-secret header required',
    timestamp: new Date().toISOString()
  });
}
