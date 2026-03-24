import { z } from 'zod';

export const patientFormSchema = z.object({
  // Group A: Sputum & Referral
  'Date of referral for TB Examination (sputum) (dd/mm/yy)': z.string().optional().or(z.literal('')),
  'Name of facility where referred to (Give code/name of all facilities)': z.string().optional().or(z.literal('')),
  
  // Group B: Diagnosis
  'TB diagnosed (Y/N)': z.string().optional().or(z.literal('')),
  'Date of TB Diagnosed (dd/mm/yy)': z.string().optional().or(z.literal('')),
  'Type of TB Diagnosed (P/EP)': z.string().optional().or(z.literal('')),
  
  // Group C: Treatment & Comorbidities
  'Date of starting ATT (dd/mm/yyyy)': z.string().optional().or(z.literal('')),
  'Date of Treatment Completion (dd/mm/yyyy)': z.string().optional().or(z.literal('')),
  'HIV Status (Positive/Negative/Unknown)': z.string().optional().or(z.literal('')),
  'Status at the time of referral (Pre ART/On ART)': z.string().optional().or(z.literal('')),
  'ART Number': z.string().optional().or(z.literal('')),
  
  // Group D: Administration
  'NIKSHAY/ABHA ID': z.string().optional().or(z.literal('')),
  'Date of registration (dd/mm/yyyy)': z.string().optional().or(z.literal('')),
  'Remarks': z.string().optional().or(z.literal('')),
  
  // Hidden system fields
  'KoboUUID': z.string().optional().or(z.literal('')),
  'KoboID': z.string().optional().or(z.literal('')),
  'Serial Number': z.string().optional().or(z.literal('')),
  
  // Closure
  'closure_reason': z.string().optional().or(z.literal(''))
});

export type PatientFormData = z.infer<typeof patientFormSchema>;
