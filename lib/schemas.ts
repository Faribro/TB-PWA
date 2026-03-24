import { z } from 'zod';

export const patientFormSchema = z.object({
  // Group A: Sputum & Referral
  'Date of referral for TB Examination (sputum) (dd/mm/yy)': z.string().optional().or(z.literal('')).or(z.undefined()),
  'Name of facility where referred to (Give code/name of all facilities)': z.string().optional().or(z.literal('')).or(z.undefined()),
  
  // Group B: Diagnosis
  'TB diagnosed (Y/N)': z.string().optional().or(z.literal('')).or(z.undefined()),
  'Date of TB Diagnosed (dd/mm/yy)': z.string().optional().or(z.literal('')).or(z.undefined()),
  'Type of TB Diagnosed (P/EP)': z.string().optional().or(z.literal('')).or(z.undefined()),
  
  // Group C: Treatment & Comorbidities
  'Date of starting ATT (dd/mm/yyyy)': z.string().optional().or(z.literal('')).or(z.undefined()),
  'Date of Treatment Completion (dd/mm/yyyy)': z.string().optional().or(z.literal('')).or(z.undefined()),
  'HIV Status (Positive/Negative/Unknown)': z.string().optional().or(z.literal('')).or(z.undefined()),
  'Status at the time of referral (Pre ART/On ART)': z.string().optional().or(z.literal('')).or(z.undefined()),
  'ART Number': z.string().optional().or(z.literal('')).or(z.undefined()),
  
  // Group D: Administration
  'NIKSHAY/ABHA ID': z.string().optional().or(z.literal('')).or(z.undefined()),
  'Date of registration (dd/mm/yyyy)': z.string().optional().or(z.literal('')).or(z.undefined()),
  'Remarks': z.string().optional().or(z.literal('')).or(z.undefined()),
  
  // Hidden system fields
  'KoboUUID': z.string().optional().or(z.literal('')).or(z.undefined()),
  'KoboID': z.string().optional().or(z.literal('')).or(z.undefined()),
  'Serial Number': z.string().optional().or(z.literal('')).or(z.undefined()),
  
  // Closure
  'closure_reason': z.string().optional().or(z.literal('')).or(z.undefined())
});

export type PatientFormData = z.infer<typeof patientFormSchema>;
