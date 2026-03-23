import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Annexure 1: Presumptive TB Register ─────────────────────────────────────
// Columns: Client ID, Name, Age, Sex, Facility, District, Screening Date,
//          Symptoms, X-Ray Result, Referred For Sputum
async function buildAnnexure1(state?: string, district?: string) {
  let query = supabase
    .from('patients')
    .select(
      'unique_id, inmate_name, age, gender, facility_name, screening_district, screening_state, screening_date, symptoms_present, chest_x_ray_result, xray_result, referral_date'
    )
    .order('screening_date', { ascending: false });

  if (state) query = query.ilike('screening_state', `%${state}%`);
  if (district) query = query.ilike('screening_district', `%${district}%`);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data || []).map((p) => ({
    'Client ID': p.unique_id || '',
    'Patient Name': p.inmate_name || '',
    Age: p.age || '',
    Sex: p.gender || '',
    Facility: p.facility_name || '',
    District: p.screening_district || '',
    State: p.screening_state || '',
    'Screening Date': p.screening_date
      ? new Date(p.screening_date).toLocaleDateString('en-IN')
      : '',
    'Symptoms Present': p.symptoms_present || 'None',
    'X-Ray Result': p.chest_x_ray_result || p.xray_result || 'Not Done',
    'Referred for Sputum': p.referral_date ? 'Yes' : 'No',
    'Referral Date': p.referral_date
      ? new Date(p.referral_date).toLocaleDateString('en-IN')
      : '',
  }));

  return rows;
}

// ── Annexure 2: TB Treatment Register ───────────────────────────────────────
// Columns: Client ID, Name, TB Type, ATT Start Date, Treatment Outcome,
//          SLA Status, District, Facility
async function buildAnnexure2(state?: string, district?: string) {
  let query = supabase
    .from('patients')
    .select(
      'unique_id, inmate_name, age, gender, facility_name, screening_district, screening_state, tb_diagnosed, att_start_date, att_completion_date, sla_status, current_phase, kobo_uuid'
    )
    .eq('tb_diagnosed', 'Y')
    .order('att_start_date', { ascending: false });

  if (state) query = query.ilike('screening_state', `%${state}%`);
  if (district) query = query.ilike('screening_district', `%${district}%`);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data || []).map((p) => ({
    'Client ID': p.unique_id || '',
    'Nikshay ID': p.kobo_uuid || '',
    'Patient Name': p.inmate_name || '',
    Age: p.age || '',
    Sex: p.gender || '',
    Facility: p.facility_name || '',
    District: p.screening_district || '',
    State: p.screening_state || '',
    'TB Confirmed': p.tb_diagnosed === 'Y' ? 'Yes' : 'No',
    'ATT Start Date': p.att_start_date
      ? new Date(p.att_start_date).toLocaleDateString('en-IN')
      : 'Not Started',
    'ATT Completion Date': p.att_completion_date
      ? new Date(p.att_completion_date).toLocaleDateString('en-IN')
      : 'Ongoing',
    'Current Phase': p.current_phase || 'ATT Initiation',
    'SLA Status': p.sla_status || 'On Track',
    'Treatment Outcome':
      p.att_completion_date
        ? 'Completed'
        : p.att_start_date
        ? 'On Treatment'
        : 'Pending Initiation',
  }));

  return rows;
}

function applyHeaderStyle(ws: XLSX.WorkSheet, headerRow: string[]) {
  headerRow.forEach((_, colIdx) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: colIdx });
    if (!ws[cellRef]) return;
    ws[cellRef].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
      fill: { fgColor: { rgb: '1E3A5F' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        bottom: { style: 'thin', color: { rgb: '4A90D9' } },
      },
    };
  });
}

export async function POST(req: NextRequest) {
  try {
    const { annexure, state, district } = await req.json();

    if (!annexure || !['1', '2', 1, 2].includes(annexure)) {
      return NextResponse.json(
        { error: 'annexure must be 1 or 2' },
        { status: 400 }
      );
    }

    const wb = XLSX.utils.book_new();
    const annexureNum = String(annexure);
    const locationLabel = district || state || 'All India';
    const generatedAt = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

    if (annexureNum === '1') {
      const rows = await buildAnnexure1(state, district);

      if (rows.length === 0) {
        return NextResponse.json(
          { error: `No presumptive TB data found for ${locationLabel}` },
          { status: 404 }
        );
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = Object.keys(rows[0]).map(() => ({ wch: 20 }));
      applyHeaderStyle(ws, Object.keys(rows[0]));
      XLSX.utils.book_append_sheet(wb, ws, 'Annexure 1 - Presumptive TB');

      // Summary sheet
      const summaryData = [
        ['Annexure 1 — Presumptive TB Register'],
        ['Generated', generatedAt],
        ['Location', locationLabel],
        ['Total Records', rows.length],
        ['Referred for Sputum', rows.filter((r) => r['Referred for Sputum'] === 'Yes').length],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    } else {
      const rows = await buildAnnexure2(state, district);

      if (rows.length === 0) {
        return NextResponse.json(
          { error: `No TB treatment data found for ${locationLabel}` },
          { status: 404 }
        );
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = Object.keys(rows[0]).map(() => ({ wch: 22 }));
      applyHeaderStyle(ws, Object.keys(rows[0]));
      XLSX.utils.book_append_sheet(wb, ws, 'Annexure 2 - TB Treatment');

      // SLA breach sub-sheet
      const breachRows = rows.filter((r) => r['SLA Status'] === 'Breach');
      if (breachRows.length > 0) {
        const wsBreaches = XLSX.utils.json_to_sheet(breachRows);
        wsBreaches['!cols'] = Object.keys(breachRows[0]).map(() => ({ wch: 22 }));
        XLSX.utils.book_append_sheet(wb, wsBreaches, 'SLA Breaches');
      }

      const summaryData = [
        ['Annexure 2 — TB Treatment Register'],
        ['Generated', generatedAt],
        ['Location', locationLabel],
        ['Total TB Confirmed', rows.length],
        ['On Treatment', rows.filter((r) => r['Treatment Outcome'] === 'On Treatment').length],
        ['Completed', rows.filter((r) => r['Treatment Outcome'] === 'Completed').length],
        ['Pending Initiation', rows.filter((r) => r['Treatment Outcome'] === 'Pending Initiation').length],
        ['SLA Breaches', rows.filter((r) => r['SLA Status'] === 'Breach').length],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Annexure_${annexureNum}_${locationLabel.replace(/\s+/g, '_')}_${generatedAt.replace(/\s+/g, '_')}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Sonic-Message': `Annexure ${annexureNum} compiled with verified Client IDs. Downloading now, Sir.`,
      },
    });
  } catch (err: any) {
    console.error('Annexure export error:', err);
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 });
  }
}
