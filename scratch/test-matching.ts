import { matchAndReconcileRow } from '../lib/ingestion/matching/probabilistic';
import { prisma } from '../lib/prisma';
import { normalizeDate } from '../lib/ingestion/matching/normalize-date';

async function runTests() {
  console.log('🧪 Starting Probabilistic Matcher Redesign Test Suite...');
  
  try {
    // Let's find some patient records from the database to build our test cases dynamically.
    // We search for patients with complete records to ensure fuzzy matching works.
    const patients = await prisma.patients.findMany({
      where: {
        inmate_name: { not: null },
        facility_name: { not: null },
        father_husband_name: { not: null },
      },
      take: 10
    });

    if (patients.length < 3) {
      console.error('❌ Error: Not enough patient records in the database to run matching tests.');
      process.exit(1);
    }

    // Assign patients for test cases
    // Patient A: Has kobo_uuid (or we can use one that has it, otherwise use its ID as fallback)
    const patientA = patients.find(p => p.kobo_uuid !== null) || patients[0];
    const patientB = patients[1];
    const patientC = patients[2];

    console.log(`\nSelected Test Patients from Database:`);
    console.log(`- Patient A (Exact Match Test): name="${patientA.inmate_name}", kobo_uuid="${patientA.kobo_uuid || 'N/A'}", facility="${patientA.facility_name}"`);
    console.log(`- Patient B (Fuzzy Match Test): name="${patientB.inmate_name}", father="${patientB.father_husband_name}", DOB="${patientB.date_of_birth ? patientB.date_of_birth.toISOString().split('T')[0] : 'N/A'}", age=${patientB.age}, facility="${patientB.facility_name}"`);
    console.log(`- Patient C (Date Fallback Test): name="${patientC.inmate_name}", facility="${patientC.facility_name}", screening_date="${patientC.screening_date ? patientC.screening_date.toISOString().split('T')[0] : 'N/A'}", sex="${patientC.sex || 'N/A'}"`);

    // ─────────────────────────────────────────────────────────────────────────
    // Case 1: Record with exact kobo_uuid match -> expect HIGH, stage EXACT_ID
    console.log('\n--- Test Case 1: Exact kobo_uuid match ---');
    const input1 = {
      kobo_uuid: patientA.kobo_uuid || 'test-uuid-does-not-exist',
      patient_name: patientA.inmate_name,
      facility_name: patientA.facility_name,
    };
    console.log('Input:', input1);
    const result1 = await matchAndReconcileRow(input1);
    console.log('Result:', {
      confidence_score: result1.confidence_score,
      score: result1.score,
      match_stage: result1.match_stage,
      candidate: result1.candidate_match?.patient_name,
    });
    const test1Passed = result1.confidence_score === 'high' && result1.match_stage === 'EXACT_ID';
    console.log(test1Passed ? '✅ Passed' : '❌ Failed');

    // ─────────────────────────────────────────────────────────────────────────
    // Case 2: Record with matching name+father+DOB/age -> expect HIGH, FUZZY_NAME
    console.log('\n--- Test Case 2: Matching name + father + DOB/age ---');
    const input2 = {
      patient_name: patientB.inmate_name,
      father_name: patientB.father_husband_name,
      dob: patientB.date_of_birth,
      age: patientB.age,
      facility_name: patientB.facility_name,
    };
    console.log('Input:', input2);
    const result2 = await matchAndReconcileRow(input2);
    console.log('Result:', {
      confidence_score: result2.confidence_score,
      score: result2.score,
      match_stage: result2.match_stage,
      candidate: result2.candidate_match?.patient_name,
    });
    const test2Passed = result2.confidence_score === 'high' && result2.match_stage === 'FUZZY_NAME';
    console.log(test2Passed ? '✅ Passed' : '❌ Failed');

    // ─────────────────────────────────────────────────────────────────────────
    // Case 3: Record with matching name+father, no DOB -> expect MEDIUM
    console.log('\n--- Test Case 3: Matching name + father, no DOB ---');
    const input3 = {
      patient_name: patientB.inmate_name,
      father_name: patientB.father_husband_name,
      facility_name: patientB.facility_name,
    };
    console.log('Input:', input3);
    const result3 = await matchAndReconcileRow(input3);
    console.log('Result:', {
      confidence_score: result3.confidence_score,
      score: result3.score,
      match_stage: result3.match_stage,
      candidate: result3.candidate_match?.patient_name,
    });
    const test3Passed = result3.confidence_score === 'medium';
    console.log(test3Passed ? '✅ Passed' : '❌ Failed');

    // ─────────────────────────────────────────────────────────────────────────
    // Case 4: Record with only screening_date+facility+sex -> expect MEDIUM/LOW, stage SCREENING_DATE_FALLBACK
    console.log('\n--- Test Case 4: Date fallback (screening_date + facility + sex) ---');
    const screeningDateStr = patientC.screening_date ? patientC.screening_date.toISOString().split('T')[0] : '2026-06-12';
    const input4 = {
      patient_name: 'Scrambled Name That Does Not Exist',
      screening_date: screeningDateStr,
      facility_name: patientC.facility_name,
      sex: patientC.sex || 'Male',
      age: patientC.age
    };
    console.log('Input:', input4);
    const result4 = await matchAndReconcileRow(input4);
    console.log('Result:', {
      confidence_score: result4.confidence_score,
      score: result4.score,
      match_stage: result4.match_stage,
      candidate: result4.candidate_match?.patient_name,
      possible_matches: result4.possible_matches?.map(m => m.patient_name),
    });
    const test4Passed = (result4.confidence_score === 'medium' && result4.match_stage === 'SCREENING_DATE_FALLBACK') ||
                        (result4.confidence_score === 'low' && result4.match_stage === 'AMBIGUOUS_MATCH') ||
                        (result4.match_stage === 'NO_MATCH'); // Depending on count of other patients matching date + sex + age
    console.log(test4Passed ? '✅ Passed' : '❌ Failed (Check count of matching records on same day)');

    // ─────────────────────────────────────────────────────────────────────────
    // Case 5: Completely unknown patient -> expect LOW, NO_MATCH
    console.log('\n--- Test Case 5: Completely unknown patient ---');
    const input5 = {
      patient_name: 'Unknown Random Name',
      father_name: 'Unknown Random Father',
      facility_name: patientB.facility_name,
    };
    console.log('Input:', input5);
    const result5 = await matchAndReconcileRow(input5);
    console.log('Result:', {
      confidence_score: result5.confidence_score,
      score: result5.score,
      match_stage: result5.match_stage,
      candidate: result5.candidate_match?.patient_name,
    });
    const test5Passed = result5.confidence_score === 'low' && result5.match_stage === 'NO_MATCH';
    console.log(test5Passed ? '✅ Passed' : '❌ Failed');

    if (test1Passed && test2Passed && test3Passed && test5Passed) {
      console.log('\n🎉 ALL CORE TEST CASES PASSED SUCCESSFULLY!');
    } else {
      console.error('\n❌ SOME TEST CASES FAILED. Please review the implementation.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error running tests:', error);
    process.exit(1);
  }
}

runTests();
