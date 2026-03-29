import { NextRequest, NextResponse } from 'next/server'

// Move ALL potentially-failing imports inside the handler
// to prevent module-load crashes from breaking the route

const KOBO_WEBHOOK_SECRET = process.env.KOBO_WEBHOOK_SECRET
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Column mapping from KoboToolbox field names → Supabase column names
const FIELD_MAP: Record<string, string> = {
  '_uuid': 'kobo_uuid',
  'Serial_No': 'serial_no',
  'Patient_Name': 'patient_name',
  'Age': 'age',
  'Sex': 'sex',
  'Submission_Date': 'submission_date',
  'Contact_Number': 'contact_number',
  'Screening_State': 'screening_state',
  'Screening_District': 'screening_district',
  'Facility_Type': 'facility_type',
  'Facility_Name': 'facility_name',
  'Microplan_Block': 'microplan_block',
  'Staff_Name': 'staff_name',
  // Symptoms
  'Symptom_Cough_2weeks': 'symptom_cough_2weeks',
  'Symptom_Fever': 'symptom_fever',
  'Symptom_Night_Sweats': 'symptom_night_sweats',
  'Symptom_Weight_Loss': 'symptom_weight_loss',
  'Symptom_Haemoptysis': 'symptom_haemoptysis',
  'Symptom_Chest_Pain': 'symptom_chest_pain',
  'Symptom_Breathlessness': 'symptom_breathlessness',
  'Symptom_Lymphadenopathy': 'symptom_lymphadenopathy',
  'Symptom_Loss_of_Appetite': 'symptom_loss_of_appetite',
  'Symptom_Other': 'symptom_other',
  'Symptom_Other_Detail': 'symptom_other_detail',
  // Diagnostics
  'Xray_Done': 'xray_done',
  'Xray_Result': 'xray_result',
  'CBNAAT_Done': 'cbnaat_done',
  'CBNAAT_Result': 'cbnaat_result',
  // Referral
  'Referred_for_Diagnosis': 'referred_for_diagnosis',
  'Referral_Date': 'referral_date',
  'Referral_Facility': 'referral_facility',
  'TB_Diagnosed': 'tb_diagnosed',
  'TB_Type': 'tb_type',
  'DR_TB': 'dr_tb',
  // Treatment
  'ATT_Started': 'att_started',
  'ATT_Start_Date': 'att_start_date',
  'Treatment_Regimen': 'treatment_regimen',
  'DOTS_Provider': 'dots_provider',
  'Treatment_Status': 'treatment_status',
  'Remarks': 'remarks',
}

function transformPayload(koboData: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  
  for (const [koboKey, supabaseKey] of Object.entries(FIELD_MAP)) {
    const val = koboData[koboKey]
    if (val === undefined || val === null || val === '') continue
    
    // Type coercion
    if (supabaseKey === 'age') {
      result[supabaseKey] = parseInt(String(val), 10) || null
    } else if (['symptom_cough_2weeks', 'symptom_fever', 'symptom_night_sweats',
                 'symptom_weight_loss', 'symptom_haemoptysis', 'symptom_chest_pain',
                 'symptom_breathlessness', 'symptom_lymphadenopathy', 
                 'symptom_loss_of_appetite', 'symptom_other', 'xray_done',
                 'cbnaat_done', 'referred_for_diagnosis', 'dr_tb', 
                 'att_started'].includes(supabaseKey)) {
      const s = String(val).toLowerCase()
      result[supabaseKey] = s === 'true' || s === '1' || s === 'yes' || s === 'selected'
    } else {
      result[supabaseKey] = val
    }
  }
  
  return result
}

// Health check
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'SAMADHAAN Kobo Webhook',
    timestamp: new Date().toISOString(),
  })
}

// Webhook receiver
export async function POST(req: NextRequest) {
  try {
    // 1. Validate secret
    const secret = req.headers.get('x-kobo-webhook-secret') 
      ?? req.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!KOBO_WEBHOOK_SECRET) {
      console.error('[webhook] KOBO_WEBHOOK_SECRET env var not set')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    if (!secret || secret !== KOBO_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse body
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // 3. Validate UUID
    const uuid = body['_uuid'] ?? body['uuid']
    if (!uuid) {
      return NextResponse.json(
        { error: 'Missing required field: _uuid' }, 
        { status: 400 }
      )
    }

    // 4. Transform payload
    const transformed = transformPayload(body)
    transformed.kobo_uuid = String(uuid)
    transformed.created_at = transformed.created_at ?? new Date().toISOString()

    // 5. Upsert to Supabase using fetch directly (avoids import issues)
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('[webhook] Missing Supabase env vars')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabaseRes = await fetch(
      `${SUPABASE_URL}/rest/v1/patients`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify(transformed),
      }
    )

    if (!supabaseRes.ok) {
      const errText = await supabaseRes.text()
      console.error('[webhook] Supabase error:', errText)
      return NextResponse.json(
        { error: 'Database error', detail: errText }, 
        { status: 500 }
      )
    }

    const data = await supabaseRes.json()
    console.log('[webhook] ✅ Upserted record:', uuid)
    
    return NextResponse.json({ 
      success: true, 
      uuid: String(uuid),
      record: Array.isArray(data) ? data[0] : data,
    })

  } catch (err) {
    // Catch-all — always return JSON, never let Next.js serve HTML
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[webhook] Unhandled error:', message)
    return NextResponse.json(
      { error: 'Internal server error', message }, 
      { status: 500 }
    )
  }
}
