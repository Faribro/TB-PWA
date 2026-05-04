import { z } from 'zod';

// Permissive schema that accepts empty strings, undefined, and null
const optionalString = z.string().optional().or(z.literal('')).or(z.null()).catch('');

export const patientFormSchema = z.object({
  // Group A: Sputum & Referral
  'Date of referral for TB Examination (sputum) (dd/mm/yy)': optionalString,
  'Name of facility where referred to (Give code/name of all facilities)': optionalString,
  'Other Facility Name': optionalString,
  
  // Group B: Diagnosis
  'TB diagnosed (Y/N)': optionalString,
  'Date of TB Diagnosed (dd/mm/yy)': optionalString,
  'Type of TB Diagnosed (P/EP)': optionalString,
  
  // Group C: Treatment & Comorbidities
  'Date of starting ATT (dd/mm/yyyy)': optionalString,
  'Date of Treatment Completion (dd/mm/yyyy)': optionalString,
  'HIV Status (Positive/Negative/Unknown)': optionalString,
  'Status at the time of referral (Pre ART/On ART)': optionalString,
  'ART Number (if on ART at the time of referral)': optionalString,
  
  // Group D: Administration
  'NIKSHAY/ABHA ID': optionalString,
  'Date of registration (dd/mm/yyyy)': optionalString,
  'Remarks': optionalString,
  
  // Hidden system fields
  'KoboUUID': optionalString,
  'Serial Number': optionalString,
  
  // Closure
  'closure_reason': optionalString
});

export type PatientFormData = z.infer<typeof patientFormSchema>;
