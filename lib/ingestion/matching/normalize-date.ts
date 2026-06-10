import { parse, format, isValid } from 'date-fns';

export function normalizeDate(dateInput: string | number | null | undefined): string {
  if (dateInput === null || dateInput === undefined) return 'INVALID_DATE';

  // Handle Excel numeric serial dates (days since 1900-01-01)
  if (typeof dateInput === 'number') {
    // Excel serial offset has a leap-year bug in 1900 where it assumes Feb 29 1900 existed.
    // If the serial value is greater than 59, we subtract 2, otherwise subtract 1.
    const offset = dateInput > 59 ? 2 : 1;
    const excelEpoch = new Date(Date.UTC(1899, 11, 30 + dateInput - offset));
    if (isValid(excelEpoch)) {
      return format(excelEpoch, 'yyyy-MM-dd');
    }
    return 'INVALID_DATE';
  }

  const cleanInput = dateInput.trim().replace(/[/.]/g, '-');
  if (!cleanInput) return 'INVALID_DATE';

  // Standard formats to try
  const formats = [
    'yyyy-MM-dd',
    'dd-MM-yyyy',
    'MM-dd-yyyy',
    'd-M-yyyy',
    'dd-MMM-yyyy',
    'd MMMM yyyy'
  ];

  for (const fmt of formats) {
    try {
      const parsed = parse(cleanInput, fmt, new Date());
      if (isValid(parsed) && parsed.getFullYear() > 1900) {
        return format(parsed, 'yyyy-MM-dd');
      }
    } catch {
      continue;
    }
  }

  // Native Date parsing fallback
  const nativeParsed = new Date(cleanInput);
  if (isValid(nativeParsed) && !isNaN(nativeParsed.getTime())) {
    return format(nativeParsed, 'yyyy-MM-dd');
  }

  return 'INVALID_DATE';
}
