import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const KOBO_BASE_URL = process.env.KOBO_API_URL!; // e.g. https://kf.kobotoolbox.org/api/v2/assets/<uid>/data/
const KOBO_API_TOKEN = process.env.KOBO_API_TOKEN!;
const PAGE_SIZE = 500;   // rows per Kobo page = one serverless invocation

// ─── Mappings ────────────────────────────────────────────────────────────────
const MAPPINGS = {
  facilityType: {
    prison: 'Prison',
    other_closed_setting: 'Other Closed Setting',
    jh_cci: 'JH-CCI',
    ddrc: 'DDRC',
  },
  state: {
    madhya_pradesh: 'Madhya Pradesh',
    uttar_pradesh: 'Uttar Pradesh',
    rajasthan: 'Rajasthan',
    maharashtra: 'Maharashtra',
    chhattisgarh: 'Chhattisgarh',
    bihar: 'Bihar',
    jharkhand: 'Jharkhand',
    delhi: 'Delhi',
    haryana: 'Haryana',
    punjab: 'Punjab',
  },
  sex: { male: 'M', m: 'M', female: 'F', f: 'F', transgender: 'T', other: 'O' },
  xray: {
    abnormal_suspected_tb_case: 'Abnormal - Suspeced_TB_Case',
    abnormal_non_tb: 'Abnormal - Non TB',
    normal: 'Normal',
  },
  hiv: { positive: 'Positive', negative: 'Negative', unknown: 'Unknown' },
  yesNo: { yes: 'Y', y: 'Y', no: 'N', n: 'N' },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getField(row: any, keys: string[]): any {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  }
  return null;
}

function parseDate(v: any): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

function cleanSymptoms(v: any): string | null {
  if (!v) return null;
  if (Array.isArray(v)) return v.map((s: string) => s.replace(/_/g, ' ')).join(', ');
  return String(v).replace(/_/g, ' ');
}

function extractGPS(geo: any) {
  if (Array.isArray(geo) && geo.length >= 2) {
    const lat = parseFloat(geo[0]), lng = parseFloat(geo[1]);
    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) return { latitude: lat, longitude: lng };
  }
  return { latitude: null, longitude: null };
}

function buildAddress(row: any): string | null {
  const parts = [
    getField(row, ['grp_address/address_block_house', 'block']),
    getField(row, ['grp_address/address_street', 'street']),
    getField(row, ['grp_address/address_city', 'city']),
    getField(row, ['grp_address/address_pin_code', 'pincode']),
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function mapRow(row: any): { record: any; error: string | null } {
  try {
    const kobo_uuid = row._uuid || row['meta/instanceID'] || row._id?.toString();
    const unique_id = getField(row, ['grp_screening/unique_id', 'unique_id', 'Serial_Number']);

    if (!kobo_uuid) return { record: null, error: `Row _id=${row._id}: missing kobo_uuid` };
    if (!unique_id) return { record: null, error: `Row _id=${row._id} uuid=${kobo_uuid}: missing unique_id` };

    const { latitude, longitude } = extractGPS(row._geolocation);

    return {
      record: {
        kobo_uuid,
        kobo_id: row._id?.toString(),
        unique_id,
        inmate_name: getField(row, ['grp_identity/inmate_name', 'inmate_name', 'name']),
        father_husband_name: getField(row, ['grp_identity/father_husband_name', 'father_husband_name']),
        age: parseInt(getField(row, ['grp_demo/age', 'age', 'Age'])) || null,
        sex: MAPPINGS.sex[(getField(row, ['grp_demo/sex', 'sex', 'gender']) ?? '').toLowerCase() as keyof typeof MAPPINGS.sex] ?? null,
        contact_number: getField(row, ['grp_demo/contact_number', 'contact_number', 'phone']),
        address: buildAddress(row),
        screening_state:
          MAPPINGS.state[(getField(row, ['grp_screening/screening_state', 'state']) ?? '').toLowerCase() as keyof typeof MAPPINGS.state] ??
          getField(row, ['grp_screening/screening_state', 'state']),
        screening_district: getField(row, ['grp_screening/screening_district', 'district', 'screening_district']),
        facility_name: getField(row, ['grp_screening/facility_name', 'facility_name', 'facility']),
        facility_type:
          MAPPINGS.facilityType[(getField(row, ['grp_screening/facility_type', 'facility_type']) ?? '').toLowerCase() as keyof typeof MAPPINGS.facilityType] ?? null,
        latitude,
        longitude,
        screening_date: parseDate(getField(row, ['grp_screening/screening_date', 'screening_date', 'date_of_screening'])),
        xray_result:
          MAPPINGS.xray[(getField(row, ['grp_tb/xray_result', 'xray_result', 'xray']) ?? '').toLowerCase() as keyof typeof MAPPINGS.xray] ??
          getField(row, ['grp_tb/xray_result', 'xray_result']),
        symptoms_10s: cleanSymptoms(getField(row, ['grp_tb/symptoms_10s', 'symptoms_10s', 'symptoms'])),
        tb_past_history: MAPPINGS.yesNo[(getField(row, ['grp_tb/tb_past_history', 'tb_past_history']) ?? '').toLowerCase() as keyof typeof MAPPINGS.yesNo] ?? null,
        hiv_status: MAPPINGS.hiv[(getField(row, ['grp_hiv/hiv_status', 'hiv_status']) ?? '').toLowerCase() as keyof typeof MAPPINGS.hiv] ?? null,
        referral_date: parseDate(getField(row, ['grp_referral/referral_date', 'referral_date'])),
        referral_facility_name: getField(row, ['grp_referral/referral_facility_name', 'referral_facility']),
        tb_diagnosed: MAPPINGS.yesNo[(getField(row, ['grp_diagnosis/tb_diagnosed', 'tb_diagnosed']) ?? '').toLowerCase() as keyof typeof MAPPINGS.yesNo] ?? null,
        tb_diagnosis_date: parseDate(getField(row, ['grp_diagnosis/tb_diagnosis_date', 'tb_diagnosis_date'])),
        tb_type: getField(row, ['grp_diagnosis/tb_type', 'tb_type']),
        att_start_date: parseDate(getField(row, ['grp_treatment/att_start_date', 'att_start_date'])),
        att_completion_date: parseDate(getField(row, ['grp_treatment/att_completion_date', 'att_completion_date'])),
        treatment_completion: parseDate(getField(row, ['grp_treatment/treatment_completion', 'treatment_completion'])),
        hiv_art_status: getField(row, ['grp_hiv/hiv_art_status', 'hiv_art_status']),
        art_number: getField(row, ['grp_hiv/art_number', 'art_number']),
        nikshay_id: getField(row, ['grp_registration/nikshay_id', 'nikshay_id']),
        registration_date: parseDate(getField(row, ['grp_registration/registration_date', 'registration_date'])),
        remarks: getField(row, ['grp_metadata/remarks', 'remarks', 'Remarks']),
        closure_reason: getField(row, ['grp_metadata/closure_reason', 'closure_reason']),
        created_at: new Date().toISOString(),
      },
      error: null,
    };
  } catch (e: any) {
    return { record: null, error: `Row _id=${row._id}: transform threw — ${e.message}` };
  }
}

// ─── Fetch ONE page from Kobo ────────────────────────────────────────────────
async function fetchKoboPage(pageUrl: string): Promise<{ results: any[]; next: string | null; count: number }> {
  const res = await fetch(pageUrl, {
    headers: { Authorization: `Token ${KOBO_API_TOKEN}` },
    signal: AbortSignal.timeout(25_000), // 25s per page — safe under Vercel's 60s limit
  });
  if (!res.ok) throw new Error(`Kobo API ${res.status}: ${res.statusText}`);
  const json = await res.json();
  return { results: json.results ?? [], next: json.next ?? null, count: json.count ?? 0 };
}

// ─── Upsert one batch into Supabase ──────────────────────────────────────────
async function upsertBatch(records: any[]): Promise<{ upserted: number; batchError: string | null }> {
  const { error } = await supabase
    .from('patients')
    .upsert(records, { onConflict: 'kobo_uuid', ignoreDuplicates: false });
  if (error) return { upserted: 0, batchError: `${error.message} [${error.code}]` };
  return { upserted: records.length, batchError: null };
}

// ─── Route handlers ───────────────────────────────────────────────────────────
// POST body: { cursor?: string }
//   cursor — the full Kobo "next" URL from the previous response.
//             Omit (or pass null) to start from the beginning.
// Response: { done, nextCursor, fetched, upserted, total, skippedRows, rowErrorSample }
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json().catch(() => ({}));
    const cursor: string | null = body.cursor ?? null;

    // Build the page URL: use cursor if provided, otherwise start at page 0
    const pageUrl = cursor ?? `${KOBO_BASE_URL}?format=json&limit=${PAGE_SIZE}&start=0`;
    console.log(`🚀 ETL page fetch: ${pageUrl}`);

    const { results, next, count } = await fetchKoboPage(pageUrl);
    console.log(`📦 Page returned ${results.length} rows (total in Kobo: ${count})`);

    // Transform rows — isolate per-row errors
    const validRecords: any[] = [];
    const rowErrors: string[] = [];
    for (const row of results) {
      const { record, error } = mapRow(row);
      if (error) { rowErrors.push(error); console.warn(`  ⚠️  ${error}`); }
      else validRecords.push(record);
    }

    // Upsert this page's valid records
    const { upserted, batchError } = validRecords.length > 0
      ? await upsertBatch(validRecords)
      : { upserted: 0, batchError: null };

    if (batchError) console.error(`  ❌ Upsert error: ${batchError}`);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Page done in ${elapsed}s — upserted: ${upserted} | next: ${next ?? 'DONE'}`);

    return NextResponse.json({
      success: !batchError,
      done: next === null,          // true when this was the last page
      nextCursor: next,             // pass back to client for the next call
      fetched: results.length,
      upserted,
      total: count,                 // total records in Kobo (for progress display)
      skippedRows: rowErrors.length,
      rowErrorSample: rowErrors.slice(0, 10),
      batchError,
      elapsedSeconds: parseFloat(elapsed),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('💥 ETL page error:', error);
    return NextResponse.json(
      { success: false, error: error.message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    endpoint: '/api/etl/kobo-sync',
    method: 'POST',
    body: '{ cursor?: string | null }',
    pageSize: PAGE_SIZE,
    koboConfigured: !!KOBO_BASE_URL && !!KOBO_API_TOKEN,
    supabaseConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
