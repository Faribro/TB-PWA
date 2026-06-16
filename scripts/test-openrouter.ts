import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Setup a small shim for process.env
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function testOpenRouter() {
  const defaultModel = process.env.OPENROUTER_DEFAULT_MODEL || 'openai/gpt-4o-2024-11-20';
  const apiKey = process.env.OPENROUTER_API_KEY_1;

  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY_1 is missing in .env.local');
    process.exit(1);
  }

  console.log(`testing openrouter via API with model: ${defaultModel}...`);

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
      'X-Title': process.env.OPENROUTER_APP_NAME || 'TB-PWA-Test',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: defaultModel,
      messages: [{
        role: 'user',
        content: 'ping! reply exact text: {"status": "ok"}'
      }],
      temperature: 0.0,
      max_tokens: 50,
    })
  });

  if (!response.ok) {
    console.error('❌ OpenRouter API failed with status:', response.status);
    const text = await response.text();
    console.error(text);
    process.exit(1);
  }

  const result = await response.json();
  console.log('✅ OpenRouter Response:', JSON.stringify(result.choices[0].message, null, 2));
}

testOpenRouter().catch(console.error);
