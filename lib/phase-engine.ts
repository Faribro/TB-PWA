/**
 * Strict Phase Engine for TB Patient Tracking
 * Maps to KoboToolbox form sections:
 * Phase A: Referral Information (referral_date, referral_facility)
 * Phase B: Diagnosis Status (tb_diagnosed)
 * Phase C: Treatment Initiation (att_start_date) 
 * Phase D: Treatment/Completion (treatment_status, att_completion_date)
 */

export type PatientPhase = 'Screening' | 'Sputum Test' | 'Diagnosis' | 'ATT Initiation' | 'Closed';

export interface PhaseResult {
  phase: PatientPhase;
  phaseIndex: number; // 0-4 for stepper visualization
  isCompleted: boolean;
  nextRequiredField: string | null;
}

export function calculatePatientPhase(patient: any): PhaseResult {
  // Only mark as Closed if there's explicit completion or TB ruled out
  if (patient.att_completion_date || patient.tb_diagnosed === 'N') {
    return {
      phase: 'Closed',
      phaseIndex: 4,
      isCompleted: true,
      nextRequiredField: null
    };
  }

  // ATT Initiation - TB diagnosed as Y but no treatment start
  if (patient.tb_diagnosed === 'Y' && !patient.att_start_date) {
    return {
      phase: 'ATT Initiation',
      phaseIndex: 3,
      isCompleted: false,
      nextRequiredField: 'att_start_date'
    };
  }

  // Diagnosis - referred but no diagnosis yet
  if (patient.referral_date && !patient.tb_diagnosed) {
    return {
      phase: 'Diagnosis',
      phaseIndex: 2,
      isCompleted: false,
      nextRequiredField: 'tb_diagnosed'
    };
  }

  // Sputum Test - screened but not referred
  if (patient.screening_date && !patient.referral_date) {
    return {
      phase: 'Sputum Test',
      phaseIndex: 1,
      isCompleted: false,
      nextRequiredField: 'referral_date'
    };
  }

  // Default to Screening
  return {
    phase: 'Screening',
    phaseIndex: 0,
    isCompleted: false,
    nextRequiredField: 'screening_date'
  };
}

export function getCompletedPhases(patient: any): number[] {
  const completed: number[] = [];
  
  if (patient.screening_date) completed.push(0);
  if (patient.referral_date) completed.push(1);
  if (patient.referral_date && patient.tb_diagnosed) completed.push(2);
  if (patient.tb_diagnosed === 'Y' && patient.att_start_date) completed.push(3);
  if (patient.att_completion_date || patient.tb_diagnosed === 'N') completed.push(4);
  
  return completed;
}

/**
 * Calculate completion percentage based on current phase
 * Screening = 20%, Sputum = 40%, Diagnosis = 60%, ATT = 80%, Closed = 100%
 */
export function calculateProgressPercentage(patient: any): number {
  const { phaseIndex } = calculatePatientPhase(patient);
  const percentages = [20, 40, 60, 80, 100];
  return percentages[phaseIndex];
}
