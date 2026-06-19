import { normalizeDate } from './normalize-date';
import { CandidateMatch } from '../../../types/ingestion';
import { prisma } from '../../../lib/prisma';

function mapPatientToCandidate(patient: any, score: number): CandidateMatch {
  return {
    id: patient.id,
    kobo_uuid: patient.kobo_uuid || null,
    patient_name: patient.inmate_name || patient.patient_name || '',
    screening_date: normalizeDate(patient.screening_date || patient.submitted_on),
    facility_name: patient.facility_name || '',
    status: patient.xray_result || patient.chest_x_ray_result || patient.status || '',
    similarity_score: Number(score.toFixed(3))
  };
}

export async function matchAndReconcileRow(
  extractedRow: any,
  existingPatients: any[] = [], // Kept for interface compatibility
  targetState: string | null = 'All',
  targetDistrict: string | null = 'All'
): Promise<{
  status: 'PENDING' | 'SYNCHRONIZED';
  confidence_score: 'high' | 'medium' | 'low';
  score: number;
  candidate_match: CandidateMatch | null;
  possible_matches?: CandidateMatch[];
  match_stage: 'EXACT_ID' | 'EXACT_NIKSHAY' | 'FUZZY_NAME' | 
               'SCREENING_DATE_FALLBACK' | 'AMBIGUOUS_MATCH' | 'NO_MATCH';
  flags?: string[];
  conflict_reason?: string;
}> {
  const inmateName = extractedRow.inmate_name || extractedRow.patient_name || '';
  const fatherName = extractedRow.father_name || extractedRow.father_husband_name || '';
  const dob = extractedRow.date_of_birth || extractedRow.dob || null;
  const age = extractedRow.age ? parseInt(String(extractedRow.age), 10) : null;
  const contact = extractedRow.contact || extractedRow.contact_number || '';
  const sex = extractedRow.sex || extractedRow.gender || '';
  const facility = extractedRow.facility_name || '';
  const screeningDate = extractedRow.screening_date || '';

  // STAGE 1 & 2: Exact ID match (check first, cheapest)
  if (extractedRow.kobo_uuid) {
    const match = await prisma.patients.findFirst({
      where: {
        facility_name: facility,
        kobo_uuid: extractedRow.kobo_uuid
      }
    });
    if (match) {
      return {
        status: 'SYNCHRONIZED',
        confidence_score: 'high',
        score: 1.0,
        match_stage: 'EXACT_ID',
        candidate_match: mapPatientToCandidate(match, 1.0)
      };
    }
  }

  if (extractedRow.nikshay_abha_id && String(extractedRow.nikshay_abha_id).trim().length > 0) {
    const match = await prisma.patients.findFirst({
      where: {
        facility_name: facility,
        nikshay_abha_id: String(extractedRow.nikshay_abha_id).trim()
      }
    });
    if (match) {
      return {
        status: 'SYNCHRONIZED',
        confidence_score: 'high',
        score: 1.0,
        match_stage: 'EXACT_NIKSHAY',
        candidate_match: mapPatientToCandidate(match, 1.0)
      };
    }
  }

  if (extractedRow.unique_id) {
    const match = await prisma.patients.findFirst({
      where: {
        facility_name: facility,
        unique_id: extractedRow.unique_id
      }
    });
    if (match) {
      return {
        status: 'SYNCHRONIZED',
        confidence_score: 'high',
        score: 1.0,
        match_stage: 'EXACT_ID',
        candidate_match: mapPatientToCandidate(match, 1.0)
      };
    }
  }

  // STAGE 3: Weighted fuzzy match
  // Query Supabase using pg_trgm GIN indexes, scoped by facility
  let candidates: any[] = [];
  if (inmateName && facility) {
    candidates = await prisma.$queryRaw`
      SELECT *, 
        similarity(inmate_name, ${inmateName}) AS name_sim,
        similarity(father_husband_name, ${fatherName}) AS father_sim
      FROM patients
      WHERE facility_name = ${facility}
        AND similarity(inmate_name, ${inmateName}) > 0.45
      ORDER BY (
        similarity(inmate_name, ${inmateName}) * 0.35 +
        similarity(father_husband_name, ${fatherName}) * 0.25
      ) DESC
      LIMIT 5
    `;
  }

  let bestCandidate: any = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    let score = 0;
    const nameSim = Number(candidate.name_sim || 0);
    const fatherSim = Number(candidate.father_sim || 0);

    // Name signals (always available)
    if (nameSim >= 0.75) score += nameSim * 0.35;
    if (fatherSim >= 0.75) score += fatherSim * 0.25;

    // Date signal — use DOB if available, age if not
    if (dob && candidate.date_of_birth) {
      const extDate = normalizeDate(dob);
      const candDate = normalizeDate(candidate.date_of_birth);
      if (extDate !== 'INVALID_DATE' && candDate !== 'INVALID_DATE' && extDate === candDate) {
        score += 0.20;
      }
    } else if (age !== null && candidate.age !== null) {
      if (Math.abs(age - Number(candidate.age)) <= 2) {
        score += 0.15;
      }
    }

    // Contact signal — sparse but high precision
    if (contact && candidate.contact_number) {
      const clean = (n: string) => n.replace(/[^0-9]/g, '').slice(-10);
      const extClean = clean(String(contact));
      const candClean = clean(String(candidate.contact_number));
      if (extClean && candClean && extClean === candClean) {
        score += 0.15;
        score = Math.max(score, 0.55); // Contact match boosts score to at least 0.55
      }
    }

    // Sex filter — not a score signal, a hard filter
    if (sex && candidate.sex) {
      if (String(sex).toLowerCase().trim() !== String(candidate.sex).toLowerCase().trim()) {
        score = 0; // different sex = discard candidate
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = { ...candidate, computed_score: score };
    }
  }

  if (candidates.length > 0 && bestCandidate) {
    const nameSim = Number(bestCandidate.name_sim || 0);
    const score = bestCandidate.computed_score;

    if (score >= 0.80 && nameSim >= 0.75) {
      return {
        status: 'SYNCHRONIZED',
        confidence_score: 'high',
        score,
        match_stage: 'FUZZY_NAME',
        candidate_match: mapPatientToCandidate(bestCandidate, score)
      };
    } else if (score >= 0.55) {
      return {
        status: 'PENDING',
        confidence_score: 'medium',
        score,
        match_stage: 'FUZZY_NAME',
        conflict_reason: `Ambiguous match found (${Math.round(score * 100)}% similarity score).`,
        candidate_match: mapPatientToCandidate(bestCandidate, score)
      };
    } else {
      return {
        status: 'PENDING',
        confidence_score: 'low',
        score,
        match_stage: 'NO_MATCH',
        conflict_reason: 'No matching candidate found with sufficient confidence.',
        candidate_match: null
      };
    }
  }

  // STAGE 4: Screening date scoped fallback (last resort)
  const normScreeningDate = normalizeDate(screeningDate);
  if (normScreeningDate !== 'INVALID_DATE' && facility) {
    const screeningDateObj = new Date(normScreeningDate);

    const fallbackPatients = await prisma.patients.findMany({
      where: {
        facility_name: facility,
        screening_date: {
          equals: screeningDateObj
        }
      },
      take: 20
    });

    let filtered = [...fallbackPatients];

    if (sex) {
      filtered = filtered.filter(p => p.sex && p.sex.toLowerCase().trim() === sex.toLowerCase().trim());
    }

    if (age !== null) {
      filtered = filtered.filter(p => p.age !== null && Math.abs(Number(p.age) - age) <= 3);
    }

    if (filtered.length === 1) {
      const best = filtered[0];
      return {
        status: 'PENDING',
        confidence_score: 'medium',
        score: 0.50,
        match_stage: 'SCREENING_DATE_FALLBACK',
        flags: ['SCREENING_DATE_FALLBACK'],
        candidate_match: mapPatientToCandidate(best, 0.50)
      };
    } else if (filtered.length >= 2 && filtered.length <= 3) {
      return {
        status: 'PENDING',
        confidence_score: 'low',
        score: 0.35,
        match_stage: 'AMBIGUOUS_MATCH',
        flags: ['AMBIGUOUS_MATCH'],
        candidate_match: mapPatientToCandidate(filtered[0], 0.35),
        possible_matches: filtered.map(p => mapPatientToCandidate(p, 0.35))
      };
    }
  }

  return {
    status: 'PENDING',
    confidence_score: 'low',
    score: 0.0,
    match_stage: 'NO_MATCH',
    conflict_reason: 'No matching candidate found in active scope.',
    candidate_match: null
  };
}
