const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envLocalPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

async function runFieldCoverageAudit() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 RUNNING FIELD COVERAGE AUDIT (PHASE 2)');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // 1. Total record count
    const totalRes = await client.query("SELECT COUNT(*) AS total FROM patients");
    const total = parseInt(totalRes.rows[0].total);
    console.log(`Step 2.1 — Total records in "patients" table: ${total}\n`);

    if (total === 0) {
      console.log('No records found. Cannot perform coverage percentages.');
      return;
    }

    // Helper to print field coverage details
    async function printCoverage(fieldName, columnName, query) {
      console.log(`Step 2.x — ${fieldName} coverage:`);
      try {
        const res = await client.query(query);
        const row = res.rows[0];
        console.log(`  - Total: ${row.total}`);
        console.log(`  - Present: ${row.present}`);
        console.log(`  - Missing: ${row.missing}`);
        console.log(`  - Coverage: ${row.pct}%`);
        return row;
      } catch (err) {
        console.error(`  ❌ Error querying ${columnName}:`, err.message);
        return null;
      }
    }

    // 2. unique_id / kobo_uuid coverage
    const uniqueIdCov = await printCoverage(
      'unique_id',
      'unique_id',
      `SELECT 
        COUNT(*) AS total,
        COUNT(unique_id) FILTER (WHERE unique_id IS NOT NULL AND unique_id != '') AS present,
        COUNT(*) FILTER (WHERE unique_id IS NULL OR unique_id = '') AS missing,
        ROUND((COUNT(unique_id) FILTER (WHERE unique_id IS NOT NULL AND unique_id != ''))::numeric / COUNT(*) * 100, 2) AS pct
      FROM patients`
    );
    console.log();

    // 3. serial_number coverage (ABSENT check)
    console.log('Step 2.3 — serial_number coverage:');
    console.log('  ❌ COLUMN ABSENT: serial_number does not exist in patients. This column must be added via migration before serial-based deduplication can be implemented.\n');

    // 4. inmate_name coverage
    const inmateNameCov = await printCoverage(
      'inmate_name',
      'inmate_name',
      `SELECT 
        COUNT(*) AS total,
        COUNT(inmate_name) FILTER (WHERE inmate_name IS NOT NULL AND inmate_name != '') AS present,
        COUNT(*) FILTER (WHERE inmate_name IS NULL OR inmate_name = '') AS missing,
        ROUND((COUNT(inmate_name) FILTER (WHERE inmate_name IS NOT NULL AND inmate_name != ''))::numeric / COUNT(*) * 100, 2) AS pct
      FROM patients`
    );
    console.log();

    // 5. father_husband_name coverage
    const fatherHusbandCov = await printCoverage(
      'father_husband_name',
      'father_husband_name',
      `SELECT 
        COUNT(*) AS total,
        COUNT(father_husband_name) FILTER (WHERE father_husband_name IS NOT NULL AND father_husband_name != '') AS present,
        COUNT(*) FILTER (WHERE father_husband_name IS NULL OR father_husband_name = '') AS missing,
        ROUND((COUNT(father_husband_name) FILTER (WHERE father_husband_name IS NOT NULL AND father_husband_name != ''))::numeric / COUNT(*) * 100, 2) AS pct
      FROM patients`
    );
    console.log();

    // 6. date_of_birth coverage
    console.log('Step 2.6 — date_of_birth and age coverage:');
    const dobAgeRes = await client.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(date_of_birth) FILTER (WHERE date_of_birth IS NOT NULL) AS has_dob,
        COUNT(*) FILTER (WHERE age IS NOT NULL AND date_of_birth IS NULL) AS has_age_only,
        COUNT(*) FILTER (WHERE age IS NULL AND date_of_birth IS NULL) AS has_neither_dob_nor_age,
        ROUND((COUNT(date_of_birth) FILTER (WHERE date_of_birth IS NOT NULL))::numeric / COUNT(*) * 100, 2) AS dob_pct,
        ROUND((COUNT(age) FILTER (WHERE age IS NOT NULL))::numeric / COUNT(*) * 100, 2) AS age_pct
      FROM patients
    `);
    const dobAge = dobAgeRes.rows[0];
    console.log(`  - Total: ${dobAge.total}`);
    console.log(`  - Has Date of Birth (DOB): ${dobAge.has_dob} (${dobAge.dob_pct}%)`);
    console.log(`  - Has Age Only (no DOB): ${dobAge.has_age_only}`);
    console.log(`  - Has Neither DOB nor Age: ${dobAge.has_neither_dob_nor_age}`);
    console.log();

    // 7. mobile_number coverage (using "contact_number")
    console.log('Step 2.7 — contact_number (mobile) coverage:');
    const contactRes = await client.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(contact_number) FILTER (WHERE contact_number IS NOT NULL AND contact_number != '') AS present,
        COUNT(*) FILTER (WHERE contact_number IS NULL OR contact_number = '') AS missing,
        COUNT(contact_number) FILTER (
          WHERE contact_number IS NOT NULL 
          AND contact_number != '' 
          AND contact_number != '-' 
          AND contact_number != '--'
          AND LENGTH(TRIM(contact_number)) >= 10
        ) AS valid,
        ROUND((COUNT(contact_number) FILTER (WHERE contact_number IS NOT NULL AND contact_number != ''))::numeric / COUNT(*) * 100, 2) AS pct,
        ROUND((COUNT(contact_number) FILTER (
          WHERE contact_number IS NOT NULL 
          AND contact_number != '' 
          AND contact_number != '-' 
          AND contact_number != '--'
          AND LENGTH(TRIM(contact_number)) >= 10
        ))::numeric / COUNT(*) * 100, 2) AS valid_pct
      FROM patients
    `);
    const contact = contactRes.rows[0];
    console.log(`  - Total: ${contact.total}`);
    console.log(`  - Present (Raw): ${contact.present} (${contact.pct}%)`);
    console.log(`  - Valid (length >= 10, not - or --): ${contact.valid} (${contact.valid_pct}%)`);
    console.log();

    // 8. screening_date coverage
    console.log('Step 2.8 — screening_date coverage:');
    const screeningRes = await client.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(screening_date) FILTER (WHERE screening_date IS NOT NULL) AS has_screening_date,
        MIN(screening_date) AS earliest_screening,
        MAX(screening_date) AS latest_screening,
        COUNT(DISTINCT screening_date) AS distinct_screening_dates,
        ROUND((COUNT(screening_date) FILTER (WHERE screening_date IS NOT NULL))::numeric / COUNT(*) * 100, 2) AS pct
      FROM patients
    `);
    const screening = screeningRes.rows[0];
    console.log(`  - Total: ${screening.total}`);
    console.log(`  - Has Screening Date: ${screening.has_screening_date} (${screening.pct}%)`);
    console.log(`  - Earliest screening: ${screening.earliest_screening}`);
    console.log(`  - Latest screening: ${screening.latest_screening}`);
    console.log(`  - Distinct screening dates: ${screening.distinct_screening_dates}`);
    console.log();

    // 9. facility_id vs facility_name audit
    console.log('Step 2.9 — facility audit:');
    console.log('  ❌ COLUMN ABSENT: facility_id does not exist in patients.');
    const facRes = await client.query(`
      SELECT 
        COUNT(DISTINCT facility_name) AS distinct_facility_names,
        COUNT(*) FILTER (WHERE facility_name IS NULL OR facility_name = '') AS missing_facility_name
      FROM patients
    `);
    const fac = facRes.rows[0];
    console.log(`  - Distinct Facility Names: ${fac.distinct_facility_names}`);
    console.log(`  - Missing Facility Name count: ${fac.missing_facility_name}`);
    
    const sampleFacs = await client.query(`
      SELECT DISTINCT facility_name 
      FROM patients 
      WHERE facility_name IS NOT NULL AND facility_name != ''
      ORDER BY facility_name
      LIMIT 10
    `);
    console.log('  - Sample facility names (top 10):');
    sampleFacs.rows.forEach(f => {
      console.log(`    * ${f.facility_name}`);
    });
    console.log();

    // 10. Compile field coverage summary table
    console.log('Step 2.10 — Compile field coverage summary table:');
    console.log('┌─────────────────────────┬──────────┬─────────────┬───────────┐');
    console.log('│ Field                   │ Present  │ Missing     │ Coverage% │');
    console.log('├─────────────────────────┼──────────┼─────────────┼───────────┤');
    console.log(`│ unique_id               │ ${String(uniqueIdCov.present).padEnd(8)} │ ${String(uniqueIdCov.missing).padEnd(11)} │ ${String(uniqueIdCov.pct + '%').padEnd(9)} │`);
    console.log(`│ serial_number           │ ${'0'.padEnd(8)} │ ${String(total).padEnd(11)} │ ${'0.00%'.padEnd(9)} │`);
    console.log(`│ inmate_name             │ ${String(inmateNameCov.present).padEnd(8)} │ ${String(inmateNameCov.missing).padEnd(11)} │ ${String(inmateNameCov.pct + '%').padEnd(9)} │`);
    console.log(`│ father_husband_name     │ ${String(fatherHusbandCov.present).padEnd(8)} │ ${String(fatherHusbandCov.missing).padEnd(11)} │ ${String(fatherHusbandCov.pct + '%').padEnd(9)} │`);
    console.log(`│ date_of_birth           │ ${String(dobAge.has_dob).padEnd(8)} │ ${String(total - dobAge.has_dob).padEnd(11)} │ ${String(dobAge.dob_pct + '%').padEnd(9)} │`);
    console.log(`│ age (fallback)          │ ${String(total - dobAge.has_neither_dob_nor_age - dobAge.has_dob).padEnd(8)} │ ${String(dobAge.has_neither_dob_nor_age).padEnd(11)} │ ${String(dobAge.age_pct + '%').padEnd(9)} │`);
    console.log(`│ contact_number (valid)  │ ${String(contact.valid).padEnd(8)} │ ${String(total - contact.valid).padEnd(11)} │ ${String(contact.valid_pct + '%').padEnd(9)} │`);
    console.log(`│ screening_date          │ ${String(screening.has_screening_date).padEnd(8)} │ ${String(total - screening.has_screening_date).padEnd(11)} │ ${String(screening.pct + '%').padEnd(9)} │`);
    console.log(`│ facility_id             │ ${'0'.padEnd(8)} │ ${String(total).padEnd(11)} │ ${'0.00%'.padEnd(9)} │`);
    console.log('└─────────────────────────┴──────────┴─────────────┴───────────┘');

  } catch (error) {
    console.error('❌ Field Coverage Audit Error:', error.message);
  } finally {
    await client.end();
  }
}

runFieldCoverageAudit();
