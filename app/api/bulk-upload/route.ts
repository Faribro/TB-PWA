import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-client'
import { auth } from '@/auth'
import { getSessionScope } from '@/lib/session-scope'

// Column name normalization map
const COLUMN_MAP: Record<string, string> = {
  'Serial No': 'serial_no',
  'Serial Number': 'serial_no',
  'serial_no': 'serial_no',
  'serial': 'serial_no',
  
  'Patient Name': 'patient_name',
  'patient_name': 'patient_name',
  'patient': 'patient_name',
  'name': 'patient_name',
  
  'Age': 'age',
  'age': 'age',
  
  'Sex': 'sex',
  'sex': 'sex',
  'Gender': 'sex',
  'gender': 'sex',
  
  'Submission Date': 'submission_date',
  'submission_date': 'submission_date',
  'date': 'submission_date',
  'screening_date': 'submission_date',
  
  'Contact Number': 'contact_number',
  'contact_number': 'contact_number',
  'phone': 'contact_number',
  'mobile': 'contact_number',
  
  'Screening State': 'screening_state',
  'screening_state': 'screening_state',
  'state': 'screening_state',
  
  'Screening District': 'screening_district',
  'screening_district': 'screening_district',
  'district': 'screening_district',
  
  'Facility Type': 'facility_type',
  'facility_type': 'facility_type',
  'facility': 'facility_type',
  
  'Facility Name': 'facility_name',
  'facility_name': 'facility_name',
  
  'Microplan Block': 'microplan_block',
  'microplan_block': 'microplan_block',
  'block': 'microplan_block',
  
  // Symptom fields
  'symptom_cough_2weeks': 'symptom_cough_2weeks',
  'Cough ≥ 2 weeks': 'symptom_cough_2weeks',
  'symptom_fever': 'symptom_fever',
  'Fever': 'symptom_fever',
  'symptom_night_sweats': 'symptom_night_sweats',
  'Night sweats': 'symptom_night_sweats',
  'symptom_weight_loss': 'symptom_weight_loss',
  'Weight loss': 'symptom_weight_loss',
  'symptom_haemoptysis': 'symptom_haemoptysis',
  'Haemoptysis': 'symptom_haemoptysis',
  'symptom_chest_pain': 'symptom_chest_pain',
  'Chest pain': 'symptom_chest_pain',
  'symptom_breathlessness': 'symptom_breathlessness',
  'Breathlessness': 'symptom_breathlessness',
  'symptom_lymphadenopathy': 'symptom_lymphadenopathy',
  'Swollen lymph nodes': 'symptom_lymphadenopathy',
  'symptom_loss_of_appetite': 'symptom_loss_of_appetite',
  'Loss of appetite': 'symptom_loss_of_appetite',
  'symptom_other': 'symptom_other',
  'Other symptom': 'symptom_other',
  'symptom_other_detail': 'symptom_other_detail',
  'Other symptom detail': 'symptom_other_detail',
  
  // X-ray and CBNAAT
  'xray_done': 'xray_done',
  'X-ray done': 'xray_done',
  'xray_result': 'xray_result',
  'X-ray result': 'xray_result',
  'cbnaat_done': 'cbnaat_done',
  'CBNAAT done': 'cbnaat_done',
  'cbnaat_result': 'cbnaat_result',
  'CBNAAT result': 'cbnaat_result',
  
  // Referral and diagnosis
  'referred_for_diagnosis': 'referred_for_diagnosis',
  'Referred for diagnosis': 'referred_for_diagnosis',
  'referral_date': 'referral_date',
  'Referral date': 'referral_date',
  'referral_facility': 'referral_facility',
  'Referral facility': 'referral_facility',
  'tb_diagnosed': 'tb_diagnosed',
  'TB diagnosed': 'tb_diagnosed',
  'tb_type': 'tb_type',
  'TB type': 'tb_type',
  'dr_tb': 'dr_tb',
  'Drug-resistant TB': 'dr_tb',
  
  // Treatment
  'att_started': 'att_started',
  'ATT started': 'att_started',
  'att_start_date': 'att_start_date',
  'ATT start date': 'att_start_date',
  'treatment_regimen': 'treatment_regimen',
  'Treatment regimen': 'treatment_regimen',
  'dots_provider': 'dots_provider',
  'DOTS provider': 'dots_provider',
  'treatment_status': 'treatment_status',
  'Treatment status': 'treatment_status',
  'remarks': 'remarks',
  'Remarks': 'remarks',
  
  // Auto-populated fields
  'Staff Name': 'staff_name',
  'staff_name': 'staff_name',
  'created_at': 'created_at',
}

// Type coercion function
function coerceValue(key: string, val: unknown): unknown {
  if (val === '' || val === null || val === undefined) {
    return null
  }
  
  // Age coercion
  if (key === 'age') {
    const num = parseInt(String(val), 10)
    return isNaN(num) ? null : num
  }
  
  // Boolean field coercion
  const booleanFields = [
    'symptom_cough_2weeks', 'symptom_fever', 'symptom_night_sweats', 'symptom_weight_loss',
    'symptom_haemoptysis', 'symptom_chest_pain', 'symptom_breathlessness', 'symptom_lymphadenopathy',
    'symptom_loss_of_appetite', 'symptom_other', 'xray_done', 'cbnaat_done',
    'referred_for_diagnosis', 'dr_tb', 'att_started'
  ]
  
  if (booleanFields.includes(key)) {
    const s = String(val).toLowerCase().trim()
    return s === 'true' || s === '1' || s === 'yes' || s === 'y'
  }
  
  // Date field coercion
  const dateFields = [
    'submission_date', 'referral_date', 'att_start_date'
  ]
  
  if (dateFields.includes(key)) {
    const date = new Date(String(val))
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]
  }
  
  return String(val).trim()
}

// Normalize column names and coerce values
function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {}
  
  for (const [rawKey, value] of Object.entries(row)) {
    const normalizedKey = COLUMN_MAP[rawKey.trim()] || rawKey.trim().toLowerCase().replace(/\s+/g, '_')
    normalized[normalizedKey] = coerceValue(normalizedKey, value)
  }
  
  return normalized
}

export async function POST(req: NextRequest) {
  try {
    // Authentication check
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // RBAC check - only PM, admin, SPM can bulk upload
    const ALLOWED_ROLES = ['PM', 'admin', 'SPM']
    const userRole = session.user.role ?? ''
    
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ 
        error: 'Forbidden - Only PM, admin, and SPM roles can bulk upload' 
      }, { status: 403 })
    }
    
    const { rows } = await req.json() as { rows: Record<string, unknown>[] }
    
    if (!rows?.length) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
    }
    
    if (rows.length > 10000) {
      return NextResponse.json({ 
        error: 'Too many rows - maximum 10,000 rows per upload' 
      }, { status: 400 })
    }
    
    const supabase = createClient()
    const scope = await getSessionScope()
    
    // Process and validate rows
    const processedRows: Record<string, unknown>[] = []
    const errors: { row: number; reason: string } = []
    
    for (let i = 0; i < rows.length; i++) {
      try {
        const normalized = normalizeRow(rows[i])
        
        // Apply RBAC rules
        if (scope.role === 'SPM' && scope.state) {
          normalized.screening_state = scope.state
        }
        
        // Add staff_name from session
        normalized.staff_name = normalized.staff_name || session.user.name
        
        // Add created_at if not present
        normalized.created_at = normalized.created_at || new Date().toISOString()
        
        // Validate required fields
        const requiredFields = ['serial_no', 'patient_name', 'age', 'sex', 'submission_date', 'screening_state', 'screening_district', 'facility_type', 'facility_name']
        const missingFields = requiredFields.filter(field => !normalized[field])
        
        if (missingFields.length > 0) {
          errors.push({ 
            row: i + 1, 
            reason: `Missing required fields: ${missingFields.join(', ')}` 
          })
          continue
        }
        
        processedRows.push(normalized)
      } catch (error) {
        errors.push({ 
          row: i + 1, 
          reason: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }
    
    if (processedRows.length === 0) {
      return NextResponse.json({ 
        error: 'No valid rows to process',
        errors 
      }, { status: 400 })
    }
    
    // Batch upsert in chunks of 100
    const BATCH_SIZE = 100
    let inserted = 0
    let updated = 0
    const batchErrors: { batch: number; error: string }[] = []
    
    for (let i = 0; i < processedRows.length; i += BATCH_SIZE) {
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const chunk = processedRows.slice(i, i + BATCH_SIZE)
      
      try {
        const { error, count } = await supabase
          .from('patients')
          .upsert(chunk, { 
            onConflict: 'serial_no',
            ignoreDuplicates: false 
          })
          .select('id')
        
        if (error) {
          batchErrors.push({ 
            batch: batchNumber, 
            error: error.message 
          })
        } else {
          const affectedCount = count ?? chunk.length
          inserted += affectedCount
        }
      } catch (error) {
        batchErrors.push({ 
          batch: batchNumber, 
          error: error instanceof Error ? error.message : 'Unknown batch error' 
        })
      }
    }
    
    const response = {
      success: batchErrors.length === 0,
      total: rows.length,
      processed: processedRows.length,
      inserted,
      updated,
      errors: errors.length,
      validationErrors: errors,
      batchErrors,
      batches: Math.ceil(processedRows.length / BATCH_SIZE)
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Bulk upload error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Bulk upload API - POST to upload patient data',
    columnMap: COLUMN_MAP,
    supportedFormats: ['CSV', 'XLSX'],
    maxRows: 10000,
    batchSize: 100
  })
}
