// @ts-ignore
import XLSX from 'xlsx-js-style';

export interface ExportOptions {
  filename?: string;
  includeMetrics?: boolean;
  districtFilter?: string;
  activeFilters?: Record<string, string>;
}

interface ColumnDefinition {
  header: string;
  accessor: (p: any, idx: number) => any;
  align: 'left' | 'right' | 'center';
  width: number;
  format?: string;
}

// Global fonts and colors matching the Premium Bright Theme
const GLOBAL_FONT = 'Segoe UI';
const HEADER_BG = '1E3A8A'; // Deep Navy
const HEADER_TEXT = 'FFFFFF';
const HEADER_BOTTOM_BORDER = '06B6D4'; // Cyan Accent

const DATA_ZEBRA_ODD = 'F8FAFC'; // Very light gray-blue
const DATA_ZEBRA_EVEN = 'FFFFFF';
const DATA_TEXT = '334155'; // Dark slate
const BORDER_COLOR = 'E2E8F0'; // Light slate border

// KPI Cards theme (Soft Slate Cards)
const KPI_BG = 'F8FAFC';
const KPI_LABEL_COLOR = '64748B';
const KPI_VALUE_COLOR = '0F172A';

// Helper to format ISO dates to YYYY-MM-DD
function formatDate(val: unknown): string {
  if (!val) return '';
  try {
    const d = new Date(val as string);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

// 42 Columns Configuration
const columnsConfig: ColumnDefinition[] = [
  {
    header: 'Serial No',
    accessor: (_, idx) => idx + 1,
    align: 'center',
    width: 10,
    format: '#,##0',
  },
  {
    header: 'Unique ID',
    accessor: (p) => p.unique_id ?? '',
    align: 'left',
    width: 24,
    format: '@',
  },
  {
    header: 'Kobo UUID',
    accessor: (p) => p.kobo_uuid ?? '',
    align: 'left',
    width: 25,
    format: '@',
  },
  {
    header: 'Patient Name',
    accessor: (p) => p.inmate_name ?? '',
    align: 'left',
    width: 22,
    format: '@',
  },
  {
    header: 'Father/Husband Name',
    accessor: (p) => p.father_husband_name ?? '',
    align: 'left',
    width: 22,
    format: '@',
  },
  {
    header: 'Date of Birth',
    accessor: (p) => (p.date_of_birth ? formatDate(p.date_of_birth) : ''),
    align: 'right',
    width: 14,
    format: 'yyyy-mm-dd',
  },
  {
    header: 'Age',
    accessor: (p) => (p.age != null && p.age !== '' ? Number(p.age) : ''),
    align: 'right',
    width: 8,
    format: '#,##0',
  },
  {
    header: 'Sex',
    accessor: (p) => p.sex ?? '',
    align: 'center',
    width: 8,
    format: '@',
  },
  {
    header: 'Contact Number',
    accessor: (p) => p.contact_number ?? '',
    align: 'left',
    width: 16,
    format: '@',
  },
  {
    header: 'Address',
    accessor: (p) => p.address ?? '',
    align: 'left',
    width: 35,
    format: '@',
  },
  {
    header: 'Inmate Type',
    accessor: (p) => p.inmate_type ?? '',
    align: 'center',
    width: 15,
    format: '@',
  },
  {
    header: 'Screening Date',
    accessor: (p) => (p.screening_date ? formatDate(p.screening_date) : ''),
    align: 'right',
    width: 15,
    format: 'yyyy-mm-dd',
  },
  {
    header: 'Submitted On',
    accessor: (p) => (p.submitted_on ? formatDate(p.submitted_on) : ''),
    align: 'right',
    width: 15,
    format: 'yyyy-mm-dd',
  },
  {
    header: 'State',
    accessor: (p) => p.screening_state ?? '',
    align: 'left',
    width: 18,
    format: '@',
  },
  {
    header: 'District',
    accessor: (p) => p.screening_district ?? '',
    align: 'left',
    width: 18,
    format: '@',
  },
  {
    header: 'Facility Name',
    accessor: (p) => p.facility_name ?? '',
    align: 'left',
    width: 25,
    format: '@',
  },
  {
    header: 'Other Facility Name',
    accessor: (p) => p.other_facility_name ?? '',
    align: 'left',
    width: 25,
    format: '@',
  },
  {
    header: 'Facility Type',
    accessor: (p) => p.facility_type ?? '',
    align: 'center',
    width: 15,
    format: '@',
  },
  {
    header: 'Staff Name',
    accessor: (p) => p.staff_name ?? '',
    align: 'left',
    width: 20,
    format: '@',
  },
  {
    header: 'Symptoms (10S)',
    accessor: (p) => p.symptoms_10s ?? '',
    align: 'left',
    width: 30,
    format: '@',
  },
  {
    header: 'TB Past History',
    accessor: (p) => p.tb_past_history ?? '',
    align: 'center',
    width: 15,
    format: '@',
  },
  {
    header: 'X-Ray Result',
    accessor: (p) => p.xray_result ?? '',
    align: 'center',
    width: 20,
    format: '@',
  },
  {
    header: 'Referral Date',
    accessor: (p) => (p.referral_date ? formatDate(p.referral_date) : ''),
    align: 'right',
    width: 15,
    format: 'yyyy-mm-dd',
  },
  {
    header: 'Referred Facility',
    accessor: (p) => p.referred_facility ?? '',
    align: 'left',
    width: 25,
    format: '@',
  },
  {
    header: 'TB Diagnosed',
    accessor: (p) => p.tb_diagnosed ?? '',
    align: 'center',
    width: 14,
    format: '@',
  },
  {
    header: 'TB Diagnosis Date',
    accessor: (p) => (p.tb_diagnosis_date ? formatDate(p.tb_diagnosis_date) : ''),
    align: 'right',
    width: 15,
    format: 'yyyy-mm-dd',
  },
  {
    header: 'TB Type',
    accessor: (p) => p.tb_type ?? '',
    align: 'center',
    width: 15,
    format: '@',
  },
  {
    header: 'ATT Start Date',
    accessor: (p) => (p.att_start_date ? formatDate(p.att_start_date) : ''),
    align: 'right',
    width: 15,
    format: 'yyyy-mm-dd',
  },
  {
    header: 'ATT Completion Date',
    accessor: (p) => (p.att_completion_date ? formatDate(p.att_completion_date) : ''),
    align: 'right',
    width: 15,
    format: 'yyyy-mm-dd',
  },
  {
    header: 'Treatment Regimen',
    accessor: (p) => p.treatment_regimen ?? '',
    align: 'left',
    width: 20,
    format: '@',
  },
  {
    header: 'HIV Status',
    accessor: (p) => p.hiv_status ?? '',
    align: 'center',
    width: 14,
    format: '@',
  },
  {
    header: 'ART Status',
    accessor: (p) => p.art_status ?? '',
    align: 'center',
    width: 14,
    format: '@',
  },
  {
    header: 'ART Number',
    accessor: (p) => p.art_number ?? '',
    align: 'left',
    width: 16,
    format: '@',
  },
  {
    header: 'NIKSHAY/ABHA ID',
    accessor: (p) => p.nikshay_abha_id ?? '',
    align: 'left',
    width: 20,
    format: '@',
  },
  {
    header: 'Registration Date',
    accessor: (p) => (p.registration_date ? formatDate(p.registration_date) : ''),
    align: 'right',
    width: 15,
    format: 'yyyy-mm-dd',
  },
  {
    header: 'Closure Reason',
    accessor: (p) => p.closure_reason ?? '',
    align: 'left',
    width: 20,
    format: '@',
  },
  {
    header: 'Remarks',
    accessor: (p) => p.remarks ?? '',
    align: 'left',
    width: 30,
    format: '@',
  },
  {
    header: 'AI Link Status',
    accessor: (p) => p.ai_link_status ?? '',
    align: 'center',
    width: 15,
    format: '@',
  },
  {
    header: 'Created At',
    accessor: (p) => (p.created_at ? formatDate(p.created_at) : ''),
    align: 'right',
    width: 15,
    format: 'yyyy-mm-dd',
  },
  {
    header: 'Updated At',
    accessor: (p) => (p.updated_at ? formatDate(p.updated_at) : ''),
    align: 'right',
    width: 15,
    format: 'yyyy-mm-dd',
  },
  {
    header: 'SLA Status',
    accessor: (p) => {
      const screeningDate = p.screening_date ? new Date(p.screening_date as string) : null;
      const daysSince = screeningDate ? Math.floor((Date.now() - screeningDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
      return !p.referral_date && daysSince && daysSince > 7 ? 'BREACH' : 'ON TRACK';
    },
    align: 'center',
    width: 14,
    format: '@',
  },
  {
    header: 'Days Since Screening',
    accessor: (p) => {
      const screeningDate = p.screening_date ? new Date(p.screening_date as string) : null;
      return screeningDate ? Math.floor((Date.now() - screeningDate.getTime()) / (1000 * 60 * 60 * 24)) : '';
    },
    align: 'right',
    width: 12,
    format: '#,##0',
  },
];

export function exportPatientsToXLSX(
  patients: Record<string, unknown>[],
  options: ExportOptions = {}
) {
  const { filename = 'samadhaan-export', includeMetrics = true, districtFilter, activeFilters } = options;

  // 1. Calculate Metrics for KPIs
  const totalPatients = patients.length;
  const tbDiagnosed = patients.filter(
    (p) => p.tb_diagnosed === 'Yes' || p.tb_diagnosed === 'Y'
  ).length;
  const attInitiated = patients.filter((p) => p.att_start_date).length;
  const slaBreaches = patients.filter((p) => {
    const screeningDate = p.screening_date ? new Date(p.screening_date as string) : null;
    if (!screeningDate) return false;
    const daysSince = Math.floor((Date.now() - screeningDate.getTime()) / (1000 * 60 * 60 * 24));
    return !p.referral_date && daysSince > 7;
  }).length;

  const suspectedCount = patients.filter((p) => {
    const xray = (p.xray_result as string || '').toLowerCase();
    return xray.includes('suspected') || xray.includes('abnormal');
  }).length;

  const attInitiationRateStr = tbDiagnosed > 0 ? `${((attInitiated / tbDiagnosed) * 100).toFixed(1)}%` : '0.0%';
  const slaComplianceRateStr = totalPatients > 0
    ? `${(((totalPatients - slaBreaches) / totalPatients) * 100).toFixed(1)}%`
    : '100.0%';

  // 2. Build AOA Data Matrix
  const aoaData: any[][] = [];

  // Row 0 (index 0): Title row
  const titleRow = new Array(42).fill('');
  titleRow[0] = 'SAMADHAAN — NATIONAL INTEGRATED TB SURVEILLANCE PLATFORM';
  aoaData.push(titleRow);

  // Row 1 (index 1): Metadata row
  const metaRow = new Array(42).fill('');
  let filterDesc = 'All Districts / National Scope';
  if (districtFilter) {
    filterDesc = `District: ${districtFilter}`;
  } else if (activeFilters) {
    const parts = Object.entries(activeFilters)
      .filter(([_, v]) => v && v !== 'all')
      .map(([k, v]) => `${k}: ${v}`);
    if (parts.length > 0) {
      filterDesc = parts.join(' | ');
    }
  }
  metaRow[0] = `Exported: ${new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })} | Active Filters: ${filterDesc}`;
  aoaData.push(metaRow);

  // Row 2 (index 2): Spacer
  aoaData.push(new Array(42).fill(''));

  // Row 3 (index 3): KPI Labels
  const kpiLabelsRow = new Array(42).fill('');
  kpiLabelsRow[0] = 'TOTAL PATIENTS SCREENED';
  kpiLabelsRow[3] = 'TB CASES DIAGNOSED';
  kpiLabelsRow[6] = 'ATT INITIATION RATE';
  kpiLabelsRow[9] = 'SLA COMPLIANCE RATE';
  aoaData.push(kpiLabelsRow);

  // Row 4 (index 4): KPI Values
  const kpiValuesRow = new Array(42).fill('');
  kpiValuesRow[0] = totalPatients;
  kpiValuesRow[3] = tbDiagnosed;
  kpiValuesRow[6] = attInitiationRateStr;
  kpiValuesRow[9] = slaComplianceRateStr;
  aoaData.push(kpiValuesRow);

  // Row 5 (index 5): Spacer
  aoaData.push(new Array(42).fill(''));

  // Row 6 (index 6): Table Header Row
  const headerRow = columnsConfig.map((col) => col.header);
  aoaData.push(headerRow);

  // Row 7+ (index 7+): Patient rows
  patients.forEach((p, idx) => {
    const patientRow = columnsConfig.map((col) => col.accessor(p, idx));
    aoaData.push(patientRow);
  });

  // Row N (index 7 + patients.length): Totals row
  const totalsRow = new Array(42).fill('');
  totalsRow[0] = 'TOTALS';
  totalsRow[3] = totalPatients;
  totalsRow[21] = suspectedCount; // X-Ray Result
  totalsRow[24] = tbDiagnosed;    // TB Diagnosed
  aoaData.push(totalsRow);

  // 3. Create sheet
  const ws = XLSX.utils.aoa_to_sheet(aoaData);

  // 4. Setup merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 41 } }, // Title
    { s: { r: 1, c: 0 }, e: { r: 1, c: 41 } }, // Metadata
    { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } },  // KPI 1 Label
    { s: { r: 4, c: 0 }, e: { r: 4, c: 2 } },  // KPI 1 Value
    { s: { r: 3, c: 3 }, e: { r: 3, c: 5 } },  // KPI 2 Label
    { s: { r: 4, c: 3 }, e: { r: 4, c: 5 } },  // KPI 2 Value
    { s: { r: 3, c: 6 }, e: { r: 3, c: 8 } },  // KPI 3 Label
    { s: { r: 4, c: 6 }, e: { r: 4, c: 8 } },  // KPI 3 Value
    { s: { r: 3, c: 9 }, e: { r: 3, c: 11 } }, // KPI 4 Label
    { s: { r: 4, c: 9 }, e: { r: 4, c: 11 } }, // KPI 4 Value
  ];

  // 5. Stylize the cells
  const totalRowsCount = 7 + patients.length; // 7 dashboard/headers rows, N data, 1 totals

  for (let r = 0; r <= totalRowsCount; r++) {
    for (let c = 0; c < 42; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) {
        ws[cellRef] = { v: '', t: 's' };
      }
      const cell = ws[cellRef];

      // Reset style object
      cell.s = {
        font: { name: GLOBAL_FONT, sz: 10, color: { rgb: DATA_TEXT } },
        alignment: { vertical: 'center' },
      };

      if (r === 0) {
        // Title Row
        cell.s.font = { name: GLOBAL_FONT, sz: 14, bold: true, color: { rgb: '0F172A' } };
        cell.s.alignment = { horizontal: 'left', vertical: 'center' };
      } else if (r === 1) {
        // Metadata Row
        cell.s.font = { name: GLOBAL_FONT, sz: 9, color: { rgb: '64748B' }, italic: true };
        cell.s.alignment = { horizontal: 'left', vertical: 'center' };
      } else if (r === 2 || r === 5) {
        // Spacer Rows - no fills or borders
      } else if (r === 3) {
        // KPI Labels Row
        if (c < 12) {
          cell.s.font = { name: GLOBAL_FONT, sz: 9, bold: true, color: { rgb: KPI_LABEL_COLOR } };
          cell.s.fill = { patternType: 'solid', fgColor: { rgb: KPI_BG } };
          cell.s.alignment = { horizontal: 'center', vertical: 'center' };
          cell.s.border = {
            top: { style: 'thin', color: { rgb: BORDER_COLOR } },
            left: { style: 'thin', color: { rgb: BORDER_COLOR } },
            right: { style: 'thin', color: { rgb: BORDER_COLOR } },
          };
        }
      } else if (r === 4) {
        // KPI Values Row
        if (c < 12) {
          cell.s.font = { name: GLOBAL_FONT, sz: 13, bold: true, color: { rgb: KPI_VALUE_COLOR } };
          cell.s.fill = { patternType: 'solid', fgColor: { rgb: KPI_BG } };
          cell.s.alignment = { horizontal: 'center', vertical: 'center' };
          cell.s.border = {
            bottom: { style: 'thin', color: { rgb: BORDER_COLOR } },
            left: { style: 'thin', color: { rgb: BORDER_COLOR } },
            right: { style: 'thin', color: { rgb: BORDER_COLOR } },
          };
        }
      } else if (r === 6) {
        // Table Header Row
        cell.s.font = { name: GLOBAL_FONT, sz: 10, bold: true, color: { rgb: HEADER_TEXT } };
        cell.s.fill = { patternType: 'solid', fgColor: { rgb: HEADER_BG } };
        cell.s.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
        cell.s.border = {
          bottom: { style: 'medium', color: { rgb: HEADER_BOTTOM_BORDER } },
        };
      } else if (r === totalRowsCount) {
        // Totals Row
        cell.s.font = { name: GLOBAL_FONT, sz: 10, bold: true, color: { rgb: '0F172A' } };
        cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'E2E8F0' } };
        const colDef = columnsConfig[c];
        cell.s.alignment = { horizontal: colDef?.align || 'left', vertical: 'center' };
        cell.s.border = {
          top: { style: 'thin', color: { rgb: '94A3B8' } },
          bottom: { style: 'double', color: { rgb: '0F172A' } },
        };
      } else {
        // Data Rows
        const colDef = columnsConfig[c];
        cell.s.alignment = { horizontal: colDef?.align || 'left', vertical: 'center' };
        
        // Zebra Striping
        const isOdd = (r - 7) % 2 !== 0;
        cell.s.fill = { patternType: 'solid', fgColor: { rgb: isOdd ? DATA_ZEBRA_ODD : DATA_ZEBRA_EVEN } };
        cell.s.border = {
          bottom: { style: 'thin', color: { rgb: BORDER_COLOR } },
        };

        // Number formats
        if (colDef.format) {
          cell.z = colDef.format;
        }

        // Conditional status badges
        const cellValue = String(cell.v || '').trim();

        // 1. SLA Status Column (Index 40)
        if (c === 40) {
          if (cellValue === 'BREACH') {
            cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'FEE2E2' } }; // Soft red
            cell.s.font = { name: GLOBAL_FONT, sz: 10, bold: true, color: { rgb: 'DC2626' } };
          } else if (cellValue === 'ON TRACK') {
            cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'D1FAE5' } }; // Soft green
            cell.s.font = { name: GLOBAL_FONT, sz: 10, color: { rgb: '065F46' } };
          }
        }
        // 2. X-Ray Result Column (Index 21)
        else if (c === 21) {
          const lVal = cellValue.toLowerCase();
          if (lVal.includes('suspected') || lVal.includes('abnormal')) {
            cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'FEF3C7' } }; // Soft amber
            cell.s.font = { name: GLOBAL_FONT, sz: 10, bold: true, color: { rgb: 'B45309' } };
          } else if (lVal.includes('normal')) {
            cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'D1FAE5' } }; // Soft green
            cell.s.font = { name: GLOBAL_FONT, sz: 10, color: { rgb: '065F46' } };
          }
        }
        // 3. TB Diagnosed Column (Index 24)
        else if (c === 24) {
          if (cellValue === 'Yes' || cellValue === 'Y') {
            cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'FEF3C7' } }; // Soft amber
            cell.s.font = { name: GLOBAL_FONT, sz: 10, bold: true, color: { rgb: 'B45309' } };
          }
        }
        // 4. HIV Status Column (Index 30)
        else if (c === 30) {
          if (cellValue === 'Positive') {
            cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'FEE2E2' } }; // Soft red
            cell.s.font = { name: GLOBAL_FONT, sz: 10, bold: true, color: { rgb: 'DC2626' } };
          } else if (cellValue === 'Negative') {
            cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'D1FAE5' } }; // Soft green
            cell.s.font = { name: GLOBAL_FONT, sz: 10, color: { rgb: '065F46' } };
          }
        }
      }
    }
  }

  // 6. Set Row Heights
  const rowHeights: { hpt: number }[] = [];
  rowHeights[0] = { hpt: 30 }; // Title row
  rowHeights[1] = { hpt: 20 }; // Metadata row
  rowHeights[2] = { hpt: 12 }; // Spacer row
  rowHeights[3] = { hpt: 20 }; // KPI Label row
  rowHeights[4] = { hpt: 26 }; // KPI Value row
  rowHeights[5] = { hpt: 12 }; // Spacer row
  rowHeights[6] = { hpt: 32 }; // Table Header row

  for (let i = 0; i < patients.length; i++) {
    rowHeights.push({ hpt: 22 }); // Data rows
  }
  rowHeights.push({ hpt: 24 }); // Totals row
  ws['!rows'] = rowHeights;

  // 7. Auto-fit columns based on headers & content
  const colWidths = columnsConfig.map((col, cIdx) => {
    let maxLen = col.header.length;
    for (let r = 7; r < totalRowsCount; r++) {
      const cellRef = XLSX.utils.encode_cell({ r, c: cIdx });
      const val = ws[cellRef]?.v;
      if (val != null) {
        const len = String(val).length;
        if (len > maxLen) maxLen = len;
      }
    }
    return { wch: Math.max(col.width, maxLen + 3) };
  });
  ws['!cols'] = colWidths;

  // 8. Freeze Pane: rows 1-7 and first two columns (A and B)
  ws['!freeze'] = { xSplit: 2, ySplit: 7 };
  ws['!views'] = [
    {
      state: 'frozen',
      xSplit: 2,
      ySplit: 7,
      topLeftCell: 'C8',
      activePane: 'bottomRight',
    },
  ];

  // 9. Auto-filter (strictly matches data table header and rows)
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: 6, c: 0 },
      e: { r: totalRowsCount - 1, c: 41 },
    }),
  };

  // 10. Workbook creation
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Patient Data');

  // 11. Create Summary Sheet
  if (includeMetrics) {
    const summaryRows: any[][] = [];

    // Title & Metadata
    summaryRows.push(['SAMADHAAN TB SURVEILLANCE PLATFORM — M&E SUMMARY']);
    summaryRows.push([
      `Report Generated: ${new Date().toISOString().split('T')[0]} | Filter Context: ${filterDesc}`,
    ]);
    summaryRows.push([]); // Spacer

    // Key Performance Indicators Section
    summaryRows.push(['Key Performance Indicator', 'Count', 'Performance Rate']);
    summaryRows.push(['Total Patients Screened', totalPatients, '100.0%']);
    summaryRows.push([
      'Suspected Cases (X-Ray Abnormal/Suspected)',
      suspectedCount,
      totalPatients > 0 ? `${((suspectedCount / totalPatients) * 100).toFixed(1)}%` : '0.0%',
    ]);
    summaryRows.push([
      'TB Diagnosed Cases',
      tbDiagnosed,
      suspectedCount > 0 ? `${((tbDiagnosed / suspectedCount) * 100).toFixed(1)}% yield` : '0.0%',
    ]);
    summaryRows.push([
      'ATT Treatment Initiated',
      attInitiated,
      tbDiagnosed > 0 ? `${((attInitiated / tbDiagnosed) * 100).toFixed(1)}% initiation` : '0.0%',
    ]);
    summaryRows.push([
      'SLA Breaches (Referral > 7 days)',
      slaBreaches,
      totalPatients > 0 ? `${((slaBreaches / totalPatients) * 100).toFixed(1)}% breach rate` : '0.0%',
    ]);
    summaryRows.push([]); // Spacer

    // District Breakdown Section
    summaryRows.push(['DISTRICT BREAKDOWN']);
    summaryRows.push([
      'District',
      'Total Screened',
      'Suspected Cases',
      'TB Diagnosed',
      'SLA Breaches',
      'Breach Rate',
    ]);

    const districtMap = new Map<string, { total: number; suspected: number; diagnosed: number; breaches: number }>();
    patients.forEach((p) => {
      const dist = (p.screening_district as string) || 'Unknown/Other';
      if (!districtMap.has(dist)) {
        districtMap.set(dist, { total: 0, suspected: 0, diagnosed: 0, breaches: 0 });
      }
      const s = districtMap.get(dist)!;
      s.total++;

      const xray = (p.xray_result as string || '').toLowerCase();
      if (xray.includes('suspected') || xray.includes('abnormal')) {
        s.suspected++;
      }

      if (p.tb_diagnosed === 'Yes' || p.tb_diagnosed === 'Y') {
        s.diagnosed++;
      }

      const screeningDate = p.screening_date ? new Date(p.screening_date as string) : null;
      const daysSince = screeningDate ? Math.floor((Date.now() - screeningDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
      const isBreach = !p.referral_date && daysSince && daysSince > 7;
      if (isBreach) {
        s.breaches++;
      }
    });

    const sortedDistricts = Array.from(districtMap.entries()).sort((a, b) => b[1].total - a[1].total);
    sortedDistricts.forEach(([dist, s]) => {
      summaryRows.push([
        dist,
        s.total,
        s.suspected,
        s.diagnosed,
        s.breaches,
        s.total > 0 ? `${((s.breaches / s.total) * 100).toFixed(1)}%` : '0.0%',
      ]);
    });

    // State Breakdown Section
    const startStateIndex = summaryRows.length;
    summaryRows.push([]); // Spacer
    summaryRows.push(['STATE BREAKDOWN']);
    summaryRows.push([
      'State',
      'Total Screened',
      'Suspected Cases',
      'TB Diagnosed',
      'SLA Breaches',
      'Breach Rate',
    ]);

    const stateMap = new Map<string, { total: number; suspected: number; diagnosed: number; breaches: number }>();
    patients.forEach((p) => {
      const st = (p.screening_state as string) || 'Unknown/Other';
      if (!stateMap.has(st)) {
        stateMap.set(st, { total: 0, suspected: 0, diagnosed: 0, breaches: 0 });
      }
      const s = stateMap.get(st)!;
      s.total++;

      const xray = (p.xray_result as string || '').toLowerCase();
      if (xray.includes('suspected') || xray.includes('abnormal')) {
        s.suspected++;
      }

      if (p.tb_diagnosed === 'Yes' || p.tb_diagnosed === 'Y') {
        s.diagnosed++;
      }

      const screeningDate = p.screening_date ? new Date(p.screening_date as string) : null;
      const daysSince = screeningDate ? Math.floor((Date.now() - screeningDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
      const isBreach = !p.referral_date && daysSince && daysSince > 7;
      if (isBreach) {
        s.breaches++;
      }
    });

    const sortedStates = Array.from(stateMap.entries()).sort((a, b) => b[1].total - a[1].total);
    sortedStates.forEach(([st, s]) => {
      summaryRows.push([
        st,
        s.total,
        s.suspected,
        s.diagnosed,
        s.breaches,
        s.total > 0 ? `${((s.breaches / s.total) * 100).toFixed(1)}%` : '0.0%',
      ]);
    });

    // Create summary worksheet
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);

    // Apply Merges for Summary headers
    wsSummary['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }, // Meta
    ];

    // Format Summary Sheet cells
    const totalSummaryRowsCount = summaryRows.length;
    for (let r = 0; r < totalSummaryRowsCount; r++) {
      for (let c = 0; c < 6; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (!wsSummary[cellRef]) {
          wsSummary[cellRef] = { v: '', t: 's' };
        }
        const cell = wsSummary[cellRef];

        // Default layout properties
        cell.s = {
          font: { name: GLOBAL_FONT, sz: 10, color: { rgb: DATA_TEXT } },
          alignment: { vertical: 'center', horizontal: c === 0 ? 'left' : 'right' },
        };

        if (r === 0) {
          cell.s.font = { name: GLOBAL_FONT, sz: 14, bold: true, color: { rgb: '0F172A' } };
          cell.s.alignment = { horizontal: 'left', vertical: 'center' };
        } else if (r === 1) {
          cell.s.font = { name: GLOBAL_FONT, sz: 9, color: { rgb: '64748B' }, italic: true };
          cell.s.alignment = { horizontal: 'left', vertical: 'center' };
        } else if (r === 2 || r === 9 || r === startStateIndex) {
          // Spacers
        } else if (r === 3 || r === 11 || r === startStateIndex + 2) {
          // Table Headers
          cell.s.font = { name: GLOBAL_FONT, sz: 10, bold: true, color: { rgb: HEADER_TEXT } };
          cell.s.fill = { patternType: 'solid', fgColor: { rgb: HEADER_BG } };
          cell.s.alignment = { horizontal: 'center', vertical: 'center' };
          cell.s.border = {
            bottom: { style: 'medium', color: { rgb: HEADER_BOTTOM_BORDER } },
          };
        } else if (r === 10 || r === startStateIndex + 1) {
          // Section Titles
          cell.s.font = { name: GLOBAL_FONT, sz: 12, bold: true, color: { rgb: '0F172A' } };
          cell.s.alignment = { horizontal: 'left', vertical: 'center' };
        } else {
          // Data rows for Summary
          cell.s.border = {
            bottom: { style: 'thin', color: { rgb: BORDER_COLOR } },
          };

          // Alternate row coloring per table
          let isOdd = false;
          if (r >= 4 && r <= 8) {
            isOdd = r % 2 !== 0;
          } else if (r >= 12 && r < startStateIndex) {
            isOdd = (r - 12) % 2 !== 0;
          } else if (r >= startStateIndex + 3) {
            isOdd = (r - (startStateIndex + 3)) % 2 !== 0;
          }

          cell.s.fill = { patternType: 'solid', fgColor: { rgb: isOdd ? DATA_ZEBRA_ODD : DATA_ZEBRA_EVEN } };
        }
      }
    }

    // Set Column Widths and Heights for Summary Sheet
    wsSummary['!cols'] = [
      { wch: 45 }, // A
      { wch: 16 }, // B
      { wch: 22 }, // C
      { wch: 15 }, // D
      { wch: 15 }, // E
      { wch: 15 }, // F
    ];

    const summaryHeights: { hpt: number }[] = [];
    for (let r = 0; r < totalSummaryRowsCount; r++) {
      if (r === 0) summaryHeights.push({ hpt: 30 });
      else if (r === 1) summaryHeights.push({ hpt: 20 });
      else if (r === 3 || r === 11 || r === startStateIndex + 2) summaryHeights.push({ hpt: 28 });
      else if (r === 10 || r === startStateIndex + 1) summaryHeights.push({ hpt: 24 });
      else summaryHeights.push({ hpt: 22 });
    }
    wsSummary['!rows'] = summaryHeights;

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  }

  // 12. Trigger browser download
  const timestamp = new Date().toISOString().split('T')[0];
  const districtSuffix = districtFilter ? `-${districtFilter.replace(/\s+/g, '-')}` : '';
  XLSX.writeFile(wb, `${filename}${districtSuffix}-${timestamp}.xlsx`);
}
