/**
 * Clear all patient-related Redis cache
 * Run this after database normalization or schema changes
 */

const { Redis } = require('@upstash/redis');
require('dotenv').config({ path: '.env.local' });

async function clearPatientCache() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🗑️  REDIS CACHE INVALIDATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.error('❌ Redis not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN');
    process.exit(1);
  }

  const redis = new Redis({ url, token });

  try {
    // Clear all patient bulk cache
    console.log('🔍 Finding patient cache keys...');
    const patientKeys = await redis.keys('patients:bulk:*');
    console.log(`Found ${patientKeys.length} patient cache keys`);

    if (patientKeys.length > 0) {
      console.log('\n🗑️  Deleting patient cache keys...');
      for (const key of patientKeys) {
        await redis.del(key);
        console.log(`  ✅ Deleted: ${key}`);
      }
    }

    // Clear all vertex cache
    console.log('\n🔍 Finding vertex cache keys...');
    const vertexKeys = await redis.keys('vertex:*');
    console.log(`Found ${vertexKeys.length} vertex cache keys`);

    if (vertexKeys.length > 0) {
      console.log('\n🗑️  Deleting vertex cache keys...');
      for (const key of vertexKeys) {
        await redis.del(key);
        console.log(`  ✅ Deleted: ${key}`);
      }
    }

    // Clear all metrics cache
    console.log('\n🔍 Finding metrics cache keys...');
    const metricsKeys = await redis.keys('metrics:*');
    console.log(`Found ${metricsKeys.length} metrics cache keys`);

    if (metricsKeys.length > 0) {
      console.log('\n🗑️  Deleting metrics cache keys...');
      for (const key of metricsKeys) {
        await redis.del(key);
        console.log(`  ✅ Deleted: ${key}`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Patient cache keys deleted:  ${patientKeys.length}`);
    console.log(`Vertex cache keys deleted:   ${vertexKeys.length}`);
    console.log(`Metrics cache keys deleted:  ${metricsKeys.length}`);
    console.log(`Total keys deleted:          ${patientKeys.length + vertexKeys.length + metricsKeys.length}`);
    console.log('\n✅ Cache cleared successfully!\n');

  } catch (error) {
    console.error('\n❌ Error clearing cache:', error);
    process.exit(1);
  }
}

clearPatientCache();
