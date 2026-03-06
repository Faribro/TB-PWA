import { z } from 'zod';

export const patientFormSchema = z.object({
  // Group A: Sputum & Referral
  'Date of referral for TB Examination (sputum) (dd/mm/yy)': z.string().optional(),
  'Name of facility where referred to (Give code/name of all facilities)': z.string().optional(),
  
  // Group B: Diagnosis
  'TB diagnosed (Y/N)': z.enum(['Y', 'N', '']).optional(),
  'Date of TB Diagnosed (dd/mm/yy)': z.string().optional(),
  'Type of TB Diagnosed (P/EP)': z.enum(['P', 'EP', '']).optional(),
  
  // Group C: Treatment & Comorbidities
  'Date of starting ATT (dd/mm/yyyy)': z.string().optional(),
  'Date of Treatment Completion (dd/mm/yyyy)': z.string().optional(),
  'HIV Status (Positive/Negative/Unknown)': z.enum(['Positive', 'Negative', 'Unknown', '']).optional(),
  'Status at the time of referral (Pre ART/On ART)': z.enum(['Pre ART', 'On ART', '']).optional(),
  'ART Number': z.string().optional(),
  
  // Group D: Administration
  'NIKSHAY/ABHA ID': z.string().optional(),
  'Date of registration (dd/mm/yyyy)': z.string().optional(),
  'Remarks': z.string().optional(),
  
  // Hidden system fields
  'KoboUUID': z.string().optional(),
  'KoboID': z.string().optional(),
  'Serial Number': z.string().optional(),
  
  // Closure
  'closure_reason': z.string().optional()
});

export type PatientFormData = z.infer<typeof patientFormSchema>;
