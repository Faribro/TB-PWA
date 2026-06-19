const { Client } = require('pg');
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

async function runAudit() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔌 RUNNING CONNECTIVITY AUDIT (PHASE 0)');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // 1. Verify credentials loaded
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const dbUrl = process.env.DATABASE_URL;
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  console.log('Supabase URL:', supabaseUrl ? 'FOUND' : 'MISSING');
  console.log('Database URL:', dbUrl ? 'FOUND' : 'MISSING');
  console.log('Redis URL:', redisUrl ? 'FOUND' : 'MISSING');
  console.log('Redis Token:', redisToken ? 'FOUND' : 'MISSING');

  if (!dbUrl || !redisUrl || !redisToken) {
    console.error('❌ BLOCKED: Supabase credentials or Redis credentials not found in .env.local.');
    process.exit(1);
  }

  // 2. Test PostgreSQL Connection
  console.log('\n🐘 Testing PostgreSQL Connection...');
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  let dbSuccess = false;
  try {
    await client.connect();
    const res = await client.query("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('✅ PostgreSQL Ping successful. Public tables count:', res.rows[0].count);
    dbSuccess = true;
  } catch (err) {
    console.error('❌ PostgreSQL Connection failed:', err.message);
  } finally {
    await client.end();
  }

  // 3. Test Upstash Redis Connection
  console.log('\n🔴 Testing Upstash Redis Connection...');
  const redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });

  let redisSuccess = false;
  try {
    const pingRes = await redis.ping();
    console.log('✅ Upstash Redis Ping successful. Response:', pingRes);
    redisSuccess = true;
  } catch (err) {
    console.error('❌ Upstash Redis Connection failed:', err.message);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  if (dbSuccess && redisSuccess) {
    console.log('🎉 PHASE 0: CONNECTIVITY SUCCESSFUL');
    process.exit(0);
  } else {
    console.log('❌ PHASE 0: CONNECTIVITY FAILED');
    process.exit(1);
  }
}

runAudit();
