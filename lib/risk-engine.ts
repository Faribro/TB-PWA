import { calculatePatientPhase } from './phase-engine';

export type RiskLevel = 'low' | 'high';

export interface PatientRisk {
  riskLevel: RiskLevel;
  reason?: string;
  daysSinceUpdate: number;
}

export function calculatePatientRisk(patient: any): PatientRisk {
  // Guard against null/undefined patient
  if (!patient) {
    return { riskLevel: 'low', daysSinceUpdate: 0, reason: 'No patient data' };
  }
  
  const phaseInfo = calculatePatientPhase(patient);
  
  // If closed loop, they are zero risk
  if (phaseInfo.phase === 'Closed') {
    return { riskLevel: 'low', daysSinceUpdate: 0, reason: 'Case is closed' };
  }

  // Determine last touch point. Use updated_at, screening_date, or submitted_on.
  // Fallbacks ensure we always have a comparative date.
  const lastTouchStr = patient.updated_at || patient.submitted_on || patient.screening_date;
  
  if (!lastTouchStr) {
    return { riskLevel: 'high', daysSinceUpdate: -1, reason: 'Missing timestamp data' };
  }

  const lastTouchDate = new Date(lastTouchStr);
  const now = new Date();
  
  // Calculate difference in days
  const diffTime = Math.abs(now.getTime() - lastTouchDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 7) {
    return { 
      riskLevel: 'high', 
      daysSinceUpdate: diffDays,
      reason: `No updates recorded in ${diffDays} days` 
    };
  }

  return { riskLevel: 'low', daysSinceUpdate: diffDays };
}
