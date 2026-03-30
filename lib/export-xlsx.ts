import * as XLSX from 'xlsx'

export function exportPatientsToXLSX(
  patients: Record<string, unknown>[],
  filename: string = 'samadhaan-export'
) {
  const headers = [
    'Serial No', 'Patient Name', 'Age', 'Sex',
    'Submission Date', 'State', 'District', 'Facility', 'Facility Type',
    'Staff Name', 'Symptoms', 'X-Ray Done', 'X-Ray Result',
    'CBNAAT Done', 'CBNAAT Result', 'TB Diagnosed', 'TB Type',
    'Drug-Resistant', 'ATT Started', 'Treatment Status', 'Remarks',
  ]

  const rows = patients.map(p => [
    p.serial_no ?? '',
    p.patient_name ?? '',
    p.age ?? '',
    p.sex ?? '',
    p.submission_date ?? '',
    p.screening_state ?? '',
    p.screening_district ?? '',
    p.facility_name ?? '',
    p.facility_type ?? '',
    p.staff_name ?? '',
    Object.entries(p)
      .filter(([k, v]) => k.startsWith('symptom_') && v === true)
      .map(([k]) => k.replace('symptom_', '').replace(/_/g, ' '))
      .join(', ') || 'None',
    p.xray_done ? 'Yes' : 'No',
    p.xray_result ?? '',
    p.cbnaat_done ? 'Yes' : 'No',
    p.cbnaat_result ?? '',
    p.tb_diagnosed ?? '',
    p.tb_type ?? '',
    p.dr_tb ? 'Yes' : 'No',
    p.att_started ? 'Yes' : 'No',
    p.treatment_status ?? '',
    p.remarks ?? '',
  ])

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  const headerRange = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
    const cell = XLSX.utils.encode_cell({ r: 0, c })
    if (!ws[cell]) continue
    ws[cell].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '01696F' } },
      alignment: { horizontal: 'center' },
    }
  }

  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length, 12) }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Screening Data')

  const totalPatients = patients.length
  const tbPositive = patients.filter(p => p.tb_diagnosed === 'Yes').length
  const summaryData = [
    ['SAMADHAAN Export Summary'],
    ['Generated', new Date().toLocaleString('en-IN')],
    ['Total Records', totalPatients],
    ['TB Positive', tbPositive],
    ['TB Positive Rate', totalPatients > 0
      ? `${((tbPositive / totalPatients) * 100).toFixed(1)}%`
      : '0%'],
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

  XLSX.writeFile(wb, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`)
}
