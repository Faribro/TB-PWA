const { Redis } = require('@upstash/redis');
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

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function runRedisAudit() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔴 RUNNING REDIS QUARANTINE AUDIT (PHASE 4)');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  try {
    // STEP 4.1 — Count all quarantine records
    console.log('Step 4.1 — Count all quarantine records:');
    const hlen = await redis.hlen('quarantine:records');
    console.log(`  - HLEN quarantine:records: ${hlen}\n`);

    if (hlen === 0) {
      console.log('No records staged in quarantine.');
      return;
    }

    // STEP 4.2 — Sample and classify
    console.log('Step 4.2 — Classifying staged records:');
    const rawRecords = await redis.hgetall('quarantine:records');
    
    let stats = {
      status: { PENDING: 0, SYNCHRONIZED: 0, FAILED_RETRY: 0, EXTRACTION_FAILED: 0, other: 0 },
      confidence: { high: 0, medium: 0, low: 0, missing: 0 },
      hasKoboUuid: 0,
      hasSerialNumber: 0,
      blockedByMissingKoboUuid: 0,
    };

    let oldestDate = null;
    let newestDate = null;

    Object.entries(rawRecords).forEach(([key, val]) => {
      const record = typeof val === 'string' ? JSON.parse(val) : val;

      // Classify status
      const status = record.quarantine_status || 'other';
      if (stats.status[status] !== undefined) {
        stats.status[status]++;
      } else {
        stats.status.other++;
      }

      // Classify confidence
      const conf = record.confidence_score;
      if (conf === 'high' || conf === 'medium' || conf === 'low') {
        stats.confidence[conf]++;
      } else {
        stats.confidence.missing++;
      }

      // Check kobo_uuid
      const koboUuid = record.kobo_uuid || record.KoboUUID;
      const hasKobo = !!koboUuid;
      if (hasKobo) stats.hasKoboUuid++;

      // Check serial_number
      const serial = record.serial_number || (record.extracted_details && record.extracted_details.serial_no);
      if (serial) stats.hasSerialNumber++;

      // STEP 4.3 — Blocked by missing kobo_uuid
      if (!hasKobo && status === 'FAILED_RETRY') {
        stats.blockedByMissingKoboUuid++;
      }

      // Timestamps
      const createdStr = record.createdAt || record.updatedAt;
      if (createdStr) {
        const d = new Date(createdStr);
        if (!isNaN(d.getTime())) {
          if (!oldestDate || d < oldestDate) oldestDate = d;
          if (!newestDate || d > newestDate) newestDate = d;
        }
      }
    });

    console.log('  - By quarantine_status:');
    Object.entries(stats.status).forEach(([k, v]) => {
      console.log(`    * ${k}: ${v}`);
    });
    console.log('  - By confidence_score:');
    Object.entries(stats.confidence).forEach(([k, v]) => {
      console.log(`    * ${k}: ${v}`);
    });
    console.log(`  - Has kobo_uuid at root: ${stats.hasKoboUuid}`);
    console.log(`  - Has serial_number (in details): ${stats.hasSerialNumber}`);
    console.log();

    // STEP 4.3 — Blocked count
    console.log('Step 4.3 — Records blocked by missing kobo_uuid:');
    console.log(`  - Staged FAILED_RETRY records with no kobo_uuid at root: ${stats.blockedByMissingKoboUuid}\n`);

    // STEP 4.4 — Timestamps
    console.log('Step 4.4 — Quarantine age check:');
    if (oldestDate && newestDate) {
      console.log(`  - Oldest record: ${oldestDate.toISOString()} (${Math.round((Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24))} days ago)`);
      console.log(`  - Newest record: ${newestDate.toISOString()} (${Math.round((Date.now() - newestDate.getTime()) / (1000 * 60 * 60 * 24))} days ago)`);
    } else {
      console.log('  - No valid timestamps found.');
    }

  } catch (error) {
    console.error('❌ Redis Audit Error:', error.message);
  }
}

runRedisAudit();
