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

async function runSchemaAudit() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🗃️ RUNNING SCHEMA AUDIT (PHASE 1)');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // STEP 1.1 - Discover tables
    console.log('--- Step 1.1: Discovering public tables ---');
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log('Tables found:', tables);

    // Identify patient table name
    const possibleNames = ['patients', 'patient_linelist', 'tb_patients', 'linelist', 'inmates'];
    const tableName = tables.find(t => possibleNames.includes(t)) || 'patients';
    console.log(`\nIdentified TABLE_NAME: "${tableName}"`);

    // STEP 1.2 - Get full column schema
    console.log(`\n--- Step 1.2: Column schema of "${tableName}" ---`);
    const colsRes = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
    
    console.log('Columns:');
    colsRes.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} | Nullable: ${col.is_nullable} | Default: ${col.column_default || 'NONE'}`);
    });

    // STEP 1.3 - Get constraints and indexes
    console.log('\n--- Step 1.3: Constraints and indexes ---');
    const constraintsRes = await client.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = $1::regclass
    `, [tableName]);
    console.log('Constraints:');
    constraintsRes.rows.forEach(con => {
      console.log(`  - ${con.conname} (${con.contype}): ${con.def}`);
    });

    const indexesRes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = $1
    `, [tableName]);
    console.log('Indexes:');
    indexesRes.rows.forEach(idx => {
      console.log(`  - ${idx.indexname}: ${idx.indexdef}`);
    });

    // STEP 1.4 - Check for pg_trgm extension
    console.log('\n--- Step 1.4: Check for pg_trgm extension ---');
    const extRes = await client.query(`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname = 'pg_trgm'
    `);
    if (extRes.rows.length > 0) {
      console.log(`✅ pg_trgm extension is INSTALLED. Version: ${extRes.rows[0].extversion}`);
    } else {
      console.log('❌ pg_trgm extension is NOT INSTALLED.');
      const availRes = await client.query(`
        SELECT name, default_version 
        FROM pg_available_extensions 
        WHERE name = 'pg_trgm'
      `);
      if (availRes.rows.length > 0) {
        console.log(`💡 pg_trgm is AVAILABLE to install (default version: ${availRes.rows[0].default_version})`);
      } else {
        console.log('❌ pg_trgm is NOT available in this DB environment.');
      }
    }

    // STEP 1.5 - Check for existing trigram indexes
    console.log('\n--- Step 1.5: Check for existing trigram indexes ---');
    const trgmIdxRes = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes
      WHERE tablename = $1
      AND (indexdef ILIKE '%trgm%' OR indexdef ILIKE '%gin%' OR indexdef ILIKE '%gist%')
    `, [tableName]);
    
    if (trgmIdxRes.rows.length > 0) {
      console.log('Trigram / GIN / GiST indexes found:');
      trgmIdxRes.rows.forEach(idx => {
        console.log(`  - ${idx.indexname}: ${idx.indexdef}`);
      });
    } else {
      console.log('No trigram indexes exist.');
    }

  } catch (error) {
    console.error('❌ Schema Audit Error:', error.message);
  } finally {
    await client.end();
  }
}

runSchemaAudit();
