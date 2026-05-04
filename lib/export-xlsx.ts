import * as XLSX from 'xlsx'

interface ExportOptions {
  filename?: string;
  includeMetrics?: boolean;
  districtFilter?: string;
}

export function exportPatientsToXLSX(
  patients: Record<string, unknown>[],
  options: ExportOptions = {}
) {
  const { filename = 'samadhaan-export', includeMetrics = true, districtFilter } = options;

  // Enhanced column mapping with all critical fields
  const headers = [
    'Serial No', 'Kobo UUID', 'Patient Name', 'Age', 'Sex', 'Contact Number',
    'Screening Date', 'State', 'District', 'Facility Name', 'Facility Type',
    'Staff Name', 'Staff Contact', 'Address',
    'Symptoms', 'X-Ray Done', 'X-Ray Result', 'X-Ray Date',
    'CBNAAT Done', 'CBNAAT Result', 'CBNAAT Date',
    'TB Diagnosed', 'TB Type', 'Diagnosis Date',
    'Drug-Resistant TB', 'HIV Status',
    'Referral Date', 'Referral Facility',
    'ATT Start Date', 'ATT Completion Date', 'Treatment Status',
    'NIKSHAY ID', 'ABHA ID',
    'SLA Status', 'Days Since Screening',
    'Remarks'
  ];

  const rows = patients.map(p => {
    const screeningDate = p.screening_date ? new Date(p.screening_date as string) : null;
    const daysSince = screeningDate ? Math.floor((Date.now() - screeningDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
    const slaStatus = !p.referral_date && daysSince && daysSince > 7 ? 'BREACH' : 'ON TRACK';

    return [
      p.serial_no ?? '',
      p.kobo_uuid ?? p.unique_id ?? '',
      p.inmate_name ?? p.patient_name ?? '',
      p.age ?? '',
      p.sex ?? '',
      p.contact_number ?? '',
      p.screening_date ? new Date(p.screening_date as string).toLocaleDateString('en-IN') : '',
      p.screening_state ?? '',
      p.screening_district ?? '',
      p.facility_name ?? '',
      p.facility_type ?? '',
      p.staff_name ?? '',
      p.staff_contact ?? '',
      p.address ?? [p.address_line1, p.address_line2, p.city, p.pincode].filter(Boolean).join(', ') ?? '',
      Object.entries(p)
        .filter(([k, v]) => k.startsWith('symptom_') && v === true)
        .map(([k]) => k.replace('symptom_', '').replace(/_/g, ' '))
        .join(', ') || 'None',
      p.xray_done ? 'Yes' : 'No',
      p.xray_result ?? '',
      p.xray_date ? new Date(p.xray_date as string).toLocaleDateString('en-IN') : '',
      p.cbnaat_done ? 'Yes' : 'No',
      p.cbnaat_result ?? '',
      p.cbnaat_date ? new Date(p.cbnaat_date as string).toLocaleDateString('en-IN') : '',
      p.tb_diagnosed ?? '',
      p.tb_type ?? '',
      p.diagnosis_date ? new Date(p.diagnosis_date as string).toLocaleDateString('en-IN') : '',
      p.dr_tb ? 'Yes' : 'No',
      p.hiv_status ?? '',
      p.referral_date ? new Date(p.referral_date as string).toLocaleDateString('en-IN') : '',
      p.referral_facility ?? '',
      p.att_start_date ? new Date(p.att_start_date as string).toLocaleDateString('en-IN') : '',
      p.att_completion_date ? new Date(p.att_completion_date as string).toLocaleDateString('en-IN') : '',
      p.treatment_status ?? '',
      p.nikshay_id ?? '',
      p.abha_id ?? '',
      slaStatus,
      daysSince ?? '',
      p.remarks ?? '',
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Professional header styling
  const headerRange = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
    const cell = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws[cell]) continue;
    ws[cell].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
      fill: { fgColor: { rgb: '0F766E' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      }
    };
  }

  // Data row styling with alternating colors
  for (let r = 1; r <= rows.length; r++) {
    for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
      const cell = XLSX.utils.encode_cell({ r, c });
      if (!ws[cell]) continue;
      
      const isEvenRow = r % 2 === 0;
      ws[cell].s = {
        font: { sz: 10, name: 'Calibri' },
        fill: { fgColor: { rgb: isEvenRow ? 'F9FAFB' : 'FFFFFF' } },
        alignment: { vertical: 'center', wrapText: false },
        border: {
          top: { style: 'thin', color: { rgb: 'E5E7EB' } },
          bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
          left: { style: 'thin', color: { rgb: 'E5E7EB' } },
          right: { style: 'thin', color: { rgb: 'E5E7EB' } }
        }
      };

      // Conditional formatting for SLA Status column (index 32)
      if (c === 32) {
        const value = ws[cell].v;
        if (value === 'BREACH') {
          ws[cell].s.fill = { fgColor: { rgb: 'FEE2E2' } };
          ws[cell].s.font = { ...ws[cell].s.font, color: { rgb: 'DC2626' }, bold: true };
        } else if (value === 'ON TRACK') {
          ws[cell].s.fill = { fgColor: { rgb: 'D1FAE5' } };
          ws[cell].s.font = { ...ws[cell].s.font, color: { rgb: '059669' } };
        }
      }
    }
  }

  // Optimal column widths
  ws['!cols'] = [
    { wch: 10 },  // Serial No
    { wch: 25 },  // Kobo UUID
    { wch: 20 },  // Patient Name
    { wch: 6 },   // Age
    { wch: 8 },   // Sex
    { wch: 15 },  // Contact
    { wch: 12 },  // Screening Date
    { wch: 18 },  // State
    { wch: 18 },  // District
    { wch: 25 },  // Facility Name
    { wch: 15 },  // Facility Type
    { wch: 20 },  // Staff Name
    { wch: 15 },  // Staff Contact
    { wch: 35 },  // Address
    { wch: 30 },  // Symptoms
    { wch: 10 },  // X-Ray Done
    { wch: 20 },  // X-Ray Result
    { wch: 12 },  // X-Ray Date
    { wch: 12 },  // CBNAAT Done
    { wch: 15 },  // CBNAAT Result
    { wch: 12 },  // CBNAAT Date
    { wch: 12 },  // TB Diagnosed
    { wch: 10 },  // TB Type
    { wch: 12 },  // Diagnosis Date
    { wch: 15 },  // DR-TB
    { wch: 12 },  // HIV Status
    { wch: 12 },  // Referral Date
    { wch: 25 },  // Referral Facility
    { wch: 12 },  // ATT Start
    { wch: 12 },  // ATT Completion
    { wch: 15 },  // Treatment Status
    { wch: 15 },  // NIKSHAY ID
    { wch: 15 },  // ABHA ID
    { wch: 12 },  // SLA Status
    { wch: 10 },  // Days Since
    { wch: 30 },  // Remarks
  ];

  // Freeze header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  // Auto-filter
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(headerRange) };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Patient Data');

  // Enhanced Summary Sheet
  if (includeMetrics) {
    const totalPatients = patients.length;
    const tbDiagnosed = patients.filter(p => p.tb_diagnosed === 'Yes' || p.tb_diagnosed === 'Y').length;
    const attInitiated = patients.filter(p => p.att_start_date).length;
    const attCompleted = patients.filter(p => p.att_completion_date).length;
    const slaBreaches = patients.filter(p => {
      const screeningDate = p.screening_date ? new Date(p.screening_date as string) : null;
      if (!screeningDate) return false;
      const daysSince = Math.floor((Date.now() - screeningDate.getTime()) / (1000 * 60 * 60 * 24));
      return !p.referral_date && daysSince > 7;
    }).length;

    const summaryData = [
      ['SAMADHAAN TB Surveillance System'],
      ['Export Summary Report'],
      [''],
      ['Generated On', new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })],
      ['Filter Applied', districtFilter || 'All Districts'],
      [''],
      ['KEY METRICS', ''],
      ['Total Patients Screened', totalPatients],
      ['TB Diagnosed', tbDiagnosed],
      ['TB Positive Rate', totalPatients > 0 ? `${((tbDiagnosed / totalPatients) * 100).toFixed(2)}%` : '0%'],
      ['ATT Initiated', attInitiated],
      ['ATT Initiation Rate', tbDiagnosed > 0 ? `${((attInitiated / tbDiagnosed) * 100).toFixed(2)}%` : '0%'],
      ['ATT Completed', attCompleted],
      ['SLA Breaches', slaBreaches],
      ['SLA Breach Rate', totalPatients > 0 ? `${((slaBreaches / totalPatients) * 100).toFixed(2)}%` : '0%'],
      [''],
      ['DISTRICT BREAKDOWN', ''],
    ];

    // District-wise summary
    const districtMap = new Map<string, { total: number; diagnosed: number; breaches: number }>();
    patients.forEach(p => {
      const district = (p.screening_district as string) || 'Unknown';
      if (!districtMap.has(district)) {
        districtMap.set(district, { total: 0, diagnosed: 0, breaches: 0 });
      }
      const stats = districtMap.get(district)!;
      stats.total++;
      if (p.tb_diagnosed === 'Yes' || p.tb_diagnosed === 'Y') stats.diagnosed++;
      
      const screeningDate = p.screening_date ? new Date(p.screening_date as string) : null;
      if (screeningDate) {
        const daysSince = Math.floor((Date.now() - screeningDate.getTime()) / (1000 * 60 * 60 * 24));
        if (!p.referral_date && daysSince > 7) stats.breaches++;
      }
    });

    summaryData.push(['District', 'Total Screened', 'TB Diagnosed', 'SLA Breaches', 'Breach Rate']);
    Array.from(districtMap.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .forEach(([district, stats]) => {
        summaryData.push([
          district,
          stats.total,
          stats.diagnosed,
          stats.breaches,
          `${((stats.breaches / stats.total) * 100).toFixed(1)}%`
        ]);
      });

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Summary sheet styling
    wsSummary['A1'].s = {
      font: { bold: true, sz: 16, color: { rgb: '0F766E' }, name: 'Calibri' },
      alignment: { horizontal: 'left', vertical: 'center' }
    };
    wsSummary['A2'].s = {
      font: { sz: 12, color: { rgb: '6B7280' }, name: 'Calibri' },
      alignment: { horizontal: 'left', vertical: 'center' }
    };

    wsSummary['!cols'] = [
      { wch: 30 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const districtSuffix = districtFilter ? `-${districtFilter.replace(/\s+/g, '-')}` : '';
  XLSX.writeFile(wb, `${filename}${districtSuffix}-${timestamp}.xlsx`);
}
