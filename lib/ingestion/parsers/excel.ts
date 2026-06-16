import ExcelJS from 'exceljs';

// Helper to handle cell objects (e.g. dates, formulas, rich text)
function getCellValueString(cellVal: any): any {
  if (cellVal === null || cellVal === undefined) return '';
  if (typeof cellVal === 'object') {
    if (cellVal instanceof Date) {
      return cellVal;
    }
    if (cellVal.result !== undefined) {
      return getCellValueString(cellVal.result);
    }
    if (cellVal.richText !== undefined) {
      return cellVal.richText.map((t: any) => t.text || '').join('');
    }
    if (cellVal.text !== undefined) {
      return cellVal.text;
    }
  }
  return cellVal;
}

export async function parseExcelBuffer(buffer: any): Promise<any[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows: any[] = [];
  let headerRowIndex = 1;
  let headers: string[] = [];

  // Scan the first 10 rows to dynamically identify headers
  for (let r = 1; r <= Math.min(10, sheet.rowCount); r++) {
    const row = sheet.getRow(r);
    // row.values is 1-indexed (element 0 is empty/undefined)
    const rowValues = (row.values as any[]) || [];
    const stringValues = rowValues.map(v => v ? String(getCellValueString(v)).toLowerCase().trim() : '');
    
    // Header heuristic: contains Name/Inmate/Patient and Date/Screening
    const hasName = stringValues.some(v => v.includes('name') || v.includes('inmate') || v.includes('patient'));
    const hasDate = stringValues.some(v => v.includes('date') || v.includes('screening'));
    
    if (hasName || hasDate) {
      headerRowIndex = r;
      headers = stringValues;
      break;
    }
  }

  // Fallback to first row values if no headers matches found
  if (headers.length === 0) {
    const rowValues = (sheet.getRow(1).values as any[]) || [];
    headers = rowValues.map(v => v ? String(getCellValueString(v)).toLowerCase().trim() : '');
  }

  // Dynamically map columns
  const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('inmate') || h.includes('patient'));
  const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('screening'));
  const facilityIdx = headers.findIndex(h => h.includes('facility') || h.includes('prison') || h.includes('center') || h.includes('location'));
  const statusIdx = headers.findIndex(h => h.includes('status') || h.includes('result') || h.includes('x-ray') || h.includes('xray') || h.includes('diagnos'));
  const idIdx = headers.findIndex(h => h.includes('id') || h.includes('serial') || h.includes('sku') || h.includes('uuid') || h.includes('nikshay'));

  for (let r = headerRowIndex + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const rowValues = (row.values as any[]) || [];
    if (rowValues.length === 0) continue;

    // Excel values array is 1-indexed, so we align with our mapped 0-indexed findIndex
    // Wait: rowValues[0] is empty, so nameIdx mapped to index `i` maps to rowValues[i] in exceljs!
    // Actually, exceljs row.values returns [empty, col1, col2, ...], so rowValues[i] corresponds to headers[i-1].
    // Since headers is built by mapping rowValues directly, they align exactly.
    const nameVal = nameIdx !== -1 ? getCellValueString(rowValues[nameIdx]) : null;
    const dateVal = dateIdx !== -1 ? getCellValueString(rowValues[dateIdx]) : null;
    const facilityVal = facilityIdx !== -1 ? getCellValueString(rowValues[facilityIdx]) : null;
    const statusVal = statusIdx !== -1 ? getCellValueString(rowValues[statusIdx]) : null;
    const idVal = idIdx !== -1 ? getCellValueString(rowValues[idIdx]) : null;

    if (!nameVal && !dateVal) continue;

    rows.push({
      id: idVal ? String(idVal).trim() : undefined,
      patient_name: nameVal ? String(nameVal).trim() : 'Unknown Name',
      screening_date: dateVal || null,
      facility_name: facilityVal ? String(facilityVal).trim() : 'Unknown Facility',
      status: statusVal ? String(statusVal).trim() : 'Pending',
      raw_details: {
        inmate_name: nameVal ? String(nameVal).trim() : undefined,
        screening_date: dateVal ? String(dateVal).trim() : undefined,
        facility_name: facilityVal ? String(facilityVal).trim() : undefined,
        xray_result: statusVal ? String(statusVal).trim() : undefined,
      }
    });
  }

  return rows;
}
