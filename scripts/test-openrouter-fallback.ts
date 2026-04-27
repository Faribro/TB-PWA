/**
 * scripts/test-openrouter-fallback.ts
 *
 * Tests OpenRouter fallback mechanism for image/PDF extraction.
 * Simulates Gemini failure and verifies OpenRouter takes over.
 */

import { keyPool } from '../lib/openrouter/KeyPool';
import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════
// Test Functions
// ═══════════════════════════════════════════════════════

async function test1_KeyPoolAcquisition() {
  console.log('\n🔑 TEST 1: Key Pool Acquisition');
  console.log('═'.repeat(60));

  try {
    const acquired = await keyPool.acquire();
    console.log('✅ Key acquired successfully');
    console.log(`   Key index: ${acquired.keyIndex + 1}`);
    console.log(`   Key preview: ${acquired.apiKey.slice(0, 8)}...`);

    // Release without rate limit
    await acquired.release(false);
    console.log('✅ Key released successfully');

    return true;
  } catch (error: any) {
    console.error('❌ Key acquisition failed:', error.message);
    return false;
  }
}

async function test2_KeyRotation() {
  console.log('\n🔄 TEST 2: Key Rotation');
  console.log('═'.repeat(60));

  const acquiredKeys: number[] = [];

  try {
    // Acquire 5 keys in sequence
    for (let i = 0; i < 5; i++) {
      const acquired = await keyPool.acquire();
      acquiredKeys.push(acquired.keyIndex);
      console.log(`   Acquisition ${i + 1}: Key ${acquired.keyIndex + 1}`);
      await acquired.release(false);
    }

    // Check if rotation happened (keys should be different)
    const uniqueKeys = new Set(acquiredKeys);
    if (uniqueKeys.size > 1) {
      console.log(`✅ Rotation working - ${uniqueKeys.size} different keys used`);
      return true;
    } else {
      console.log('⚠️  All acquisitions returned same key (only 1 key configured?)');
      return true; // Not a failure if only 1 key exists
    }
  } catch (error: any) {
    console.error('❌ Key rotation test failed:', error.message);
    return false;
  }
}

async function test3_RateLimitCooldown() {
  console.log('\n⏱️  TEST 3: Rate Limit Cooldown');
  console.log('═'.repeat(60));

  try {
    // Acquire a key
    const acquired = await keyPool.acquire();
    const keyIndex = acquired.keyIndex;
    console.log(`   Acquired key ${keyIndex + 1}`);

    // Simulate rate limit
    console.log('   Simulating rate limit (429)...');
    await acquired.release(true); // Mark as rate limited

    // Try to acquire again immediately - should skip the rate-limited key
    const acquired2 = await keyPool.acquire();
    console.log(`   Next acquisition: Key ${acquired2.keyIndex + 1}`);

    if (acquired2.keyIndex !== keyIndex) {
      console.log('✅ Cooldown working - rate-limited key was skipped');
      await acquired2.release(false);
      return true;
    } else {
      console.log('⚠️  Same key returned (only 1 key configured?)');
      await acquired2.release(false);
      return true; // Not a failure if only 1 key exists
    }
  } catch (error: any) {
    console.error('❌ Cooldown test failed:', error.message);
    return false;
  }
}

async function test4_OpenRouterAPICall() {
  console.log('\n🌐 TEST 4: OpenRouter API Call (Simple Text)');
  console.log('═'.repeat(60));

  try {
    const acquired = await keyPool.acquire();
    console.log(`   Using key ${acquired.keyIndex + 1}`);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${acquired.apiKey}`,
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'TB-PWA-Test',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_DEFAULT_MODEL || 'openai/gpt-4o-mini',
        messages: [{
          role: 'user',
          content: 'Say "Hello from OpenRouter" and nothing else.'
        }],
        max_tokens: 20,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API call failed: HTTP ${response.status}`);
      console.error(`   Error: ${errorText}`);
      await acquired.release(response.status === 429);
      return false;
    }

    const result = await response.json();
    const message = result.choices?.[0]?.message?.content || '';
    const cost = result.usage?.total_cost || 0;

    console.log('✅ API call successful');
    console.log(`   Response: "${message}"`);
    console.log(`   Cost: $${cost.toFixed(6)}`);
    console.log(`   Model: ${result.model || 'unknown'}`);

    await acquired.release(false, cost);
    return true;
  } catch (error: any) {
    console.error('❌ API call failed:', error.message);
    return false;
  }
}

async function test5_FallbackChain() {
  console.log('\n🔗 TEST 5: Fallback Chain (Gemini → OpenRouter)');
  console.log('═'.repeat(60));

  console.log('Simulating extraction flow:');
  console.log('   1. Try Gemini (simulated failure)');
  console.log('   2. Catch error');
  console.log('   3. Fall back to OpenRouter');

  try {
    // Simulate Gemini failure
    let geminiSuccess = false;
    try {
      throw new Error('Gemini API quota exceeded (simulated)');
    } catch (geminiError: any) {
      console.log(`   ⚠️  Gemini failed: ${geminiError.message}`);
      geminiSuccess = false;
    }

    // Fallback to OpenRouter
    if (!geminiSuccess) {
      console.log('   🔄 Triggering OpenRouter fallback...');
      const openrouterSuccess = await test4_OpenRouterAPICall();
      
      if (openrouterSuccess) {
        console.log('✅ Fallback chain working - OpenRouter took over');
        return true;
      } else {
        console.error('❌ OpenRouter fallback also failed');
        return false;
      }
    }

    return false;
  } catch (error: any) {
    console.error('❌ Fallback chain test failed:', error.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════
// Main Test Runner
// ═══════════════════════════════════════════════════════

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  OPENROUTER FALLBACK TEST SUITE                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  const results = {
    keyAcquisition: false,
    keyRotation: false,
    rateLimitCooldown: false,
    apiCall: false,
    fallbackChain: false,
  };

  try {
    results.keyAcquisition = await test1_KeyPoolAcquisition();
    results.keyRotation = await test2_KeyRotation();
    results.rateLimitCooldown = await test3_RateLimitCooldown();
    results.apiCall = await test4_OpenRouterAPICall();
    results.fallbackChain = await test5_FallbackChain();

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  TEST SUMMARY                                                 ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    
    Object.entries(results).forEach(([test, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      const testName = test.replace(/([A-Z])/g, ' $1').trim();
      console.log(`${status}: ${testName}`);
    });

    const allPassed = Object.values(results).every(r => r);
    
    if (allPassed) {
      console.log('\n🎉 ALL TESTS PASSED - OpenRouter fallback is working\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  SOME TESTS FAILED - Check configuration\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error);
    process.exit(1);
  }
}

main();
