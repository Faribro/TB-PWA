import { distance } from 'fastest-levenshtein';
import { differenceInDays, parseISO, isValid } from 'date-fns';
import { normalizeDate } from './normalize-date';
import { QuarantineRecord, CandidateMatch } from '../../../types/ingestion';

export function calculateStringSimilarity(s1: string, s2: string): number {
  const str1 = s1.trim().toLowerCase();
  const str2 = s2.trim().toLowerCase();
  
  if (!str1 && !str2) return 1.0;
  if (!str1 || !str2) return 0.0;
  if (str1 === str2) return 1.0;

  const maxLength = Math.max(str1.length, str2.length);
  const levDistance = distance(str1, str2);
  
  return (maxLength - levDistance) / maxLength;
}

export function matchAndReconcileRow(
  extractedRow: any,
  existingPatients: any[], // Mapped objects containing patient details
  targetState: string | null = 'All',
  targetDistrict: string | null = 'All'
): {
  status: 'PENDING' | 'SYNCHRONIZED';
  confidence_score: 'high' | 'medium' | 'low';
  conflict_reason?: string;
  candidate_match: CandidateMatch | null;
} {
  const normExtractedDate = normalizeDate(extractedRow.screening_date);
  const name = extractedRow.patient_name || 'Unknown Name';
  const facility = extractedRow.facility_name || '';

  let bestMatch: any = null;
  let bestScore = 0;

  // Pass 1: Deterministic Match by unique ID or exact composite parameters
  if (extractedRow.id) {
    const directMatch = existingPatients.find(
      p => p.id === extractedRow.id || p.nikshay_abha_id === extractedRow.id || p.kobo_uuid === extractedRow.id
    );
    if (directMatch) {
      return {
        status: 'SYNCHRONIZED', // Exact ID match can be automatically synchronized
        confidence_score: 'high',
        candidate_match: {
          id: directMatch.id,
          patient_name: directMatch.inmate_name || directMatch.patient_name || '',
          screening_date: normalizeDate(directMatch.screening_date || directMatch.submitted_on),
          facility_name: directMatch.facility_name || '',
          status: directMatch.status || directMatch.xray_result || '',
          similarity_score: 1.0
        }
      };
    }
  }

  // Pass 2: Probabilistic match (sliding window ±2 days)
  const extractedDateObj = normExtractedDate !== 'INVALID_DATE' ? parseISO(normExtractedDate) : null;

  for (const patient of existingPatients) {
    // Apply geographic filtering scope if specified
    const pState = patient.screening_state || patient.state || '';
    const pDistrict = patient.screening_district || patient.district || '';
    
    if (targetState && targetState !== 'All' && pState !== targetState) continue;
    if (targetDistrict && targetDistrict !== 'All' && pDistrict !== targetDistrict) continue;

    const patientDateStr = normalizeDate(patient.screening_date || patient.submitted_on);
    const patientDateObj = patientDateStr !== 'INVALID_DATE' ? parseISO(patientDateStr) : null;

    let dateMatch = false;
    if (extractedDateObj && patientDateObj && isValid(extractedDateObj) && isValid(patientDateObj)) {
      const dayDiff = Math.abs(differenceInDays(extractedDateObj, patientDateObj));
      if (dayDiff <= 2) {
        dateMatch = true;
      }
    } else if (normExtractedDate === 'INVALID_DATE' && patientDateStr === 'INVALID_DATE') {
      // If both lack dates, allow a match based purely on text details
      dateMatch = true;
    }

    if (!dateMatch) continue;

    // Evaluate text similarities
    const pName = patient.inmate_name || patient.patient_name || '';
    const pFacility = patient.facility_name || '';

    const nameSim = calculateStringSimilarity(name, pName);
    const facilitySim = calculateStringSimilarity(facility, pFacility);

    // Dynamic weight combination: 70% Name, 30% Facility
    const combinedScore = (nameSim * 0.70) + (facilitySim * 0.30);

    if (combinedScore > bestScore) {
      bestScore = combinedScore;
      bestMatch = patient;
    }
  }

  // Evaluate final matching confidence scores
  if (bestScore >= 0.85) {
    // Confirmed merge (deterministic probability)
    return {
      status: 'SYNCHRONIZED',
      confidence_score: 'high',
      candidate_match: {
        id: bestMatch.id,
        patient_name: bestMatch.inmate_name || bestMatch.patient_name || '',
        screening_date: normalizeDate(bestMatch.screening_date || bestMatch.submitted_on),
        facility_name: bestMatch.facility_name || '',
        status: bestMatch.status || bestMatch.xray_result || '',
        similarity_score: Number(bestScore.toFixed(3))
      }
    };
  } else if (bestScore >= 0.65) {
    // Gray zone conflict
    return {
      status: 'PENDING',
      confidence_score: 'medium',
      conflict_reason: `Ambiguous match found (${Math.round(bestScore * 100)}% similarity).`,
      candidate_match: {
        id: bestMatch.id,
        patient_name: bestMatch.inmate_name || bestMatch.patient_name || '',
        screening_date: normalizeDate(bestMatch.screening_date || bestMatch.submitted_on),
        facility_name: bestMatch.facility_name || '',
        status: bestMatch.status || bestMatch.xray_result || '',
        similarity_score: Number(bestScore.toFixed(3))
      }
    };
  } else {
    // Staged new entry
    return {
      status: 'PENDING',
      confidence_score: 'low',
      conflict_reason: 'No matching candidate found in current date scope.',
      candidate_match: null
    };
  }
}
