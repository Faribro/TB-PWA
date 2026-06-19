import { prisma } from '../lib/prisma';
import { logAudit } from '../lib/audit-log';

async function runTests() {
  console.log('🏁 Starting Linelist Database & OCC Logic Tests...');
  const testPatientName = `Test Inmate-${Date.now()}`;
  let testPatientId: string | null = null;
  let firstUpdatedAt: Date | null = null;

  try {
    // 1. Create a Test Patient (Simulate Insert)
    console.log('\n1. Testing Patient Insertion...');
    const inserted = await prisma.patients.create({
      data: {
        inmate_name: testPatientName,
        facility_name: 'Test Facility',
        screening_date: new Date(),
        updated_at: new Date()
      }
    });

    testPatientId = inserted.id;
    firstUpdatedAt = inserted.updated_at;
    console.log(`✅ Patient inserted successfully. ID: ${testPatientId}, updated_at: ${firstUpdatedAt?.toISOString()}`);

    // Log Insertion Audit (simulating route logic)
    await logAudit({
      table_name: 'patients',
      record_id: testPatientId,
      action: 'INSERT',
      new_data: inserted,
      changed_by: 'cli-test-runner'
    });
    console.log('✅ Insertion audit logged.');

    // 2. Perform a successful OCC update (Simulate first update)
    console.log('\n2. Testing Successful OCC Update...');
    if (!firstUpdatedAt) throw new Error('Missing insertion updated_at');

    const nextUpdatedAt = new Date();
    const updateResult = await prisma.patients.updateMany({
      where: {
        id: testPatientId,
        updated_at: firstUpdatedAt
      },
      data: {
        age: 35,
        updated_at: nextUpdatedAt
      }
    });

    console.log(`Update result count: ${updateResult.count}`);
    if (updateResult.count !== 1) {
      throw new Error('OCC Update failed! Count should be 1.');
    }
    console.log('✅ Successful OCC Update passed.');

    // Fetch updated record to get new updated_at
    const updatedRecord = await prisma.patients.findUnique({
      where: { id: testPatientId }
    });
    const secondUpdatedAt = updatedRecord?.updated_at;
    console.log(`Updated record new updated_at: ${secondUpdatedAt?.toISOString()}`);

    // 3. Attempt a conflicting OCC update (Simulate second simultaneous edit using stale timestamp)
    console.log('\n3. Testing OCC Conflict Detection...');
    // We try to update using 'firstUpdatedAt' which is now stale
    const conflictResult = await prisma.patients.updateMany({
      where: {
        id: testPatientId,
        updated_at: firstUpdatedAt
      },
      data: {
        age: 40,
        updated_at: new Date()
      }
    });

    console.log(`Conflict update result count: ${conflictResult.count}`);
    if (conflictResult.count !== 0) {
      throw new Error('Conflict update succeeded when it should have failed! Count should be 0.');
    }
    console.log('✅ OCC Conflict detection passed (count was 0).');

    // 4. Test Audit logging & deletion
    console.log('\n4. Testing Deletion & Audit Trail...');
    const patientToDelete = await prisma.patients.findUnique({
      where: { id: testPatientId }
    });

    if (!patientToDelete) throw new Error('Failed to retrieve test record for deletion');

    await logAudit({
      table_name: 'patients',
      record_id: testPatientId,
      action: 'DELETE',
      old_data: patientToDelete,
      changed_by: 'cli-test-runner'
    });
    console.log('✅ Deletion audit logged.');

    await prisma.patients.delete({
      where: { id: testPatientId }
    });
    console.log('✅ Patient deleted from database.');

    // 5. Verify audit log entry actually exists in DB
    console.log('\n5. Verifying Audit Log in DB...');
    // Since audit_log is accessed via Supabase client (using service role key),
    // let's fetch it via direct sql or query check. We can check if getSupabaseClient can fetch it.
    const { getSupabaseClient } = require('../lib/supabase-server');
    const supabase = getSupabaseClient();
    const { data: logs, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('record_id', testPatientId)
      .eq('action', 'DELETE');

    if (error) {
      throw new Error(`Failed to fetch audit log from DB: ${error.message}`);
    }

    if (!logs || logs.length === 0) {
      throw new Error('No audit log found in DB for the test deletion!');
    }

    console.log(`✅ Audit log verified in database. Action: ${logs[0].action}, record_id: ${logs[0].record_id}`);

    // 6. Test GET /api/linelist/count
    console.log('\n6. Testing GET /api/linelist/count...');
    const sample = await prisma.patients.findFirst({
      where: { screening_state: { not: null }, screening_district: { not: null } },
      select: { screening_date: true, screening_state: true, screening_district: true }
    });

    if (!sample || !sample.screening_state || !sample.screening_district || !sample.screening_date) {
      console.log('TEST 6: SKIPPED — no records with state+district in DB');
    } else {
      const { GET: countHandler } = require('../app/api/linelist/count/route');
      const mockReq = new Request(`http://localhost/api/linelist/count?` +
        `screening_date=${sample.screening_date.toISOString().split('T')[0]}` +
        `&state=${encodeURIComponent(sample.screening_state)}` +
        `&district=${encodeURIComponent(sample.screening_district)}`);
      
      // Warm up to initialize module and Prisma pool connection
      await countHandler(mockReq);

      const start = Date.now();
      const response = await countHandler(mockReq);
      const data = await response.json();
      const elapsed = Date.now() - start;

      if (typeof data.existing_count !== 'number') {
        throw new Error('TEST 6A: existing_count must be number');
      }
      if (data.existing_count < 0) {
        throw new Error('TEST 6B: existing_count must be >= 0');
      }
      if (elapsed >= 500) {
        throw new Error(`TEST 6C: response time ${elapsed}ms must be < 500ms`);
      }
      console.log(`✅ TEST 6: PASS — ${data.existing_count} existing rows, ${elapsed}ms`);
    }

    console.log('\n🎉 ALL DATABASE AND OCC VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');

  } catch (err: any) {
    console.error('\n❌ TEST SUITE FAILED:', err.message || err);
    // Cleanup if test patient was left behind
    if (testPatientId) {
      try {
        await prisma.patients.deleteMany({ where: { id: testPatientId } });
        console.log('🧹 Cleaned up test record.');
      } catch (_) {}
    }
    process.exit(1);
  }
}

runTests();
