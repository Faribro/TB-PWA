const { Redis } = require('@upstash/redis');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load .env.local
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

async function checkQuarantine() {
  try {
    const rawRecords = await redis.hgetall('quarantine:records');
    console.log('Quarantine raw records:', rawRecords);
    if (!rawRecords) {
      console.log('No records found in quarantine:records.');
      return;
    }
    const keys = Object.keys(rawRecords);
    console.log('Number of keys in quarantine:records:', keys.length);
    console.log('Keys:', keys);
    
    const sampleKey = keys[0];
    if (sampleKey) {
      const sampleValue = rawRecords[sampleKey];
      console.log('Sample Record for key', sampleKey, ':', typeof sampleValue === 'string' ? JSON.parse(sampleValue) : sampleValue);
    }
  } catch (error) {
    console.error('Error fetching from Redis:', error);
  }
}

checkQuarantine();
