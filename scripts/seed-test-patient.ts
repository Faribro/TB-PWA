/**
 * Seed test patient with complete clinical data
 * Run: bun run scripts/seed-test-patient.ts
 */

import { prisma } from '@/lib/prisma';

async function seedTestPatient() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🌱 SEEDING TEST PATIENT WITH CLINICAL DATA');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  try {
    const testPatient = await prisma.patients.create({
      data: {
        kobo_uuid: `test-clinical-${Date.now()}`,
        unique_id: `TEST-${Date.now()}`,
        inmate_name: 'Test Patient Clinical Data',
        age: 35,
        sex: 'Male',
        facility_name: 'Test Facility',
        facility_type: 'Prison',
        screening_state: 'Maharashtra',
        screening_district: 'Mumbai',
        staff_name: 'Test Staff',
        screening_date: new Date('2024-01-15'),
        xray_result: 'Suspected TB Case',
        
        // Complete clinical data
        referral_date: new Date('2024-01-20'),
        referred_facility: 'DMC-Designated microscopy centre',
        tb_diagnosed: 'Y',
        tb_diagnosis_date: new Date('2024-01-25'),
        tb_type: 'Pulmonary',
        att_start_date: new Date('2024-02-01'),
        att_completion_date: new Date('2024-08-01'),
        hiv_status: 'Negative',
        art_status: 'Pre ART',
        art_number: 'ART123456',
        nikshay_abha_id: 'NIKSHAY789',
        registration_date: new Date('2024-02-05'),
        remarks: 'Test patient for clinical data verification'
        // other_facility_name removed - not in Prisma schema
      }
    });

    console.log('✅ Test patient created successfully!');
    console.log(`   ID: ${testPatient.id}`);
    console.log(`   Kobo UUID: ${testPatient.kobo_uuid}`);
    console.log(`   Name: ${testPatient.inmate_name}\n`);

    console.log('📊 Clinical fields populated:');
    console.log(`   ✅ referral_date: ${testPatient.referral_date}`);
    console.log(`   ✅ referred_facility: ${testPatient.referred_facility}`);
    console.log(`   ✅ tb_diagnosed: ${testPatient.tb_diagnosed}`);
    console.log(`   ✅ tb_diagnosis_date: ${testPatient.tb_diagnosis_date}`);
    console.log(`   ✅ tb_type: ${testPatient.tb_type}`);
    console.log(`   ✅ att_start_date: ${testPatient.att_start_date}`);
    console.log(`   ✅ att_completion_date: ${testPatient.att_completion_date}`);
    console.log(`   ✅ hiv_status: ${testPatient.hiv_status}`);
    console.log(`   ✅ art_status: ${testPatient.art_status}`);
    console.log(`   ✅ art_number: ${testPatient.art_number}`);
    console.log(`   ✅ nikshay_abha_id: ${testPatient.nikshay_abha_id}`);
    console.log(`   ✅ registration_date: ${testPatient.registration_date}`);
    console.log(`   ✅ remarks: ${testPatient.remarks}`);

    console.log('\n✅ Test patient ready for clinical data tests!');
    console.log('   Run: bun run test:clinical-all');

  } catch (error) {
    console.error('❌ Failed to seed test patient:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestPatient();
