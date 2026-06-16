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

async function runDataQualityAudit() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 RUNNING DATA QUALITY AUDIT (PHASE 3)');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // STEP 3.1 - Detect exact duplicate names within same facility + date
    console.log('Step 3.1 — Exact duplicate name groups (same facility + date):');
    const dupNamesRes = await client.query(`
      SELECT 
        facility_name, 
        screening_date, 
        inmate_name,         
        father_husband_name, 
        COUNT(*) AS occurrences
      FROM patients
      GROUP BY facility_name, screening_date, inmate_name, father_husband_name
      HAVING COUNT(*) > 1
      ORDER BY occurrences DESC
      LIMIT 10
    `);
    
    // Count total duplicate groups
    const totalDupsGroupRes = await client.query(`
      SELECT COUNT(*) as total_groups FROM (
        SELECT 1
        FROM patients
        GROUP BY facility_name, screening_date, inmate_name, father_husband_name
        HAVING COUNT(*) > 1
      ) as sub
    `);
    console.log(`  - Total duplicate groups: ${totalDupsGroupRes.rows[0].total_groups}`);
    console.log('  - Top 10 duplicates:');
    dupNamesRes.rows.forEach(row => {
      console.log(`    * ${row.inmate_name} (S/O: ${row.father_husband_name || 'N/A'}) at ${row.facility_name} on ${row.screening_date ? row.screening_date.toISOString().split('T')[0] : 'N/A'}: ${row.occurrences} times`);
    });
    console.log();

    // STEP 3.2 - Identical mobile number collisions
    console.log('Step 3.2 — Shared contact numbers (mobile collisions):');
    const contactRes = await client.query(`
      SELECT 
        contact_number,
        COUNT(*) AS occurrences,
        COUNT(DISTINCT inmate_name) AS distinct_names
      FROM patients
      WHERE contact_number IS NOT NULL 
        AND contact_number != ''
        AND contact_number != '-'
        AND contact_number != '--'
        AND LENGTH(TRIM(contact_number)) >= 10
      GROUP BY contact_number
      HAVING COUNT(*) > 1
      ORDER BY occurrences DESC
      LIMIT 10
    `);
    
    const totalSharedRes = await client.query(`
      SELECT COUNT(*) as total_shared FROM (
        SELECT 1 FROM patients
        WHERE contact_number IS NOT NULL 
          AND contact_number != ''
          AND contact_number != '-'
          AND contact_number != '--'
          AND LENGTH(TRIM(contact_number)) >= 10
        GROUP BY contact_number
        HAVING COUNT(*) > 1
      ) as sub
    `);
    console.log(`  - Total shared contact numbers: ${totalSharedRes.rows[0].total_shared}`);
    console.log('  - Top 10 shared numbers:');
    contactRes.rows.forEach(row => {
      console.log(`    * Number: ${row.contact_number} | Occurrences: ${row.occurrences} | Distinct Names: ${row.distinct_names}`);
    });
    console.log();

    // STEP 3.3 - Nameless records
    console.log('Step 3.3 — Nameless records (NULL or empty inmate_name):');
    const namelessRes = await client.query(`
      SELECT COUNT(*) AS nameless_records,
        facility_name,
        screening_date
      FROM patients
      WHERE inmate_name IS NULL OR TRIM(inmate_name) = ''
      GROUP BY facility_name, screening_date
      ORDER BY nameless_records DESC
      LIMIT 10
    `);
    
    const totalNamelessRes = await client.query("SELECT COUNT(*) as total FROM patients WHERE inmate_name IS NULL OR TRIM(inmate_name) = ''");
    console.log(`  - Total nameless records in database: ${totalNamelessRes.rows[0].total}`);
    console.log('  - Breakdown by facility + date (Top 10):');
    namelessRes.rows.forEach(row => {
      console.log(`    * ${row.facility_name} on ${row.screening_date ? row.screening_date.toISOString().split('T')[0] : 'N/A'}: ${row.nameless_records} nameless records`);
    });
    console.log();

    // STEP 3.4 - Suspiciously short names
    console.log('Step 3.4 — Suspiciously short names (< 3 chars):');
    const shortNamesRes = await client.query(`
      SELECT inmate_name, COUNT(*) as occurrences
      FROM patients
      WHERE LENGTH(TRIM(COALESCE(inmate_name, ''))) < 3
        AND inmate_name IS NOT NULL
      GROUP BY inmate_name
      ORDER BY occurrences DESC
      LIMIT 10
    `);
    
    const totalShortRes = await client.query("SELECT COUNT(*) as total FROM patients WHERE LENGTH(TRIM(COALESCE(inmate_name, ''))) < 3 AND inmate_name IS NOT NULL");
    console.log(`  - Total short names (< 3 chars): ${totalShortRes.rows[0].total}`);
    console.log('  - Top 10 short names:');
    shortNamesRes.rows.forEach(row => {
      console.log(`    * Name: "${row.inmate_name}" | Occurrences: ${row.occurrences}`);
    });
    console.log();

    // STEP 3.5 - Date of birth sanity check
    console.log('Step 3.5 — Date of birth sanity checks:');
    const sanityRes = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE date_of_birth > CURRENT_DATE) AS future_dob,
        COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM AGE(date_of_birth)) > 120) AS impossible_age,
        COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM AGE(date_of_birth)) < 5) AS under_5_years,
        COUNT(*) FILTER (WHERE date_of_birth IS NOT NULL 
          AND age IS NOT NULL 
          AND ABS(EXTRACT(YEAR FROM AGE(date_of_birth)) - age) > 3) AS dob_age_mismatch
      FROM patients
    `);
    const sanity = sanityRes.rows[0];
    console.log(`  - Future DOBs (DOB > today): ${sanity.future_dob}`);
    console.log(`  - Impossible age (DOB > 120 years ago): ${sanity.impossible_age}`);
    console.log(`  - Under 5 years (DOB < 5 years ago): ${sanity.under_5_years}`);
    console.log(`  - DOB and Age mismatch (> 3 years difference): ${sanity.dob_age_mismatch}`);

  } catch (error) {
    console.error('❌ Data Quality Audit Error:', error.message);
  } finally {
    await client.end();
  }
}

runDataQualityAudit();
