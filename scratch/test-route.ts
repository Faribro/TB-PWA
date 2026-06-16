import { GET } from '../app/api/patient-sync/route';
import { NextRequest } from 'next/server';
import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testWithId(patientId: string) {
  console.log(`\nTesting GET request to /api/patient-sync with id "${patientId}"...`);
  const req = new NextRequest(`http://localhost:3000/api/patient-sync?patientId=${patientId}`);
  try {
    const res = await GET(req);
    console.log('Response Status:', res.status);
    const body = await res.json();
    console.log('Response Body:', body);
  } catch (error) {
    console.error('Unhandled route error:', error);
  }
}

async function run() {
  await testWithId('24953dc7-5ea8-489a-b9b3-62d5c7304559');
  await testWithId('undefined');
  await testWithId('null');
  await testWithId('');
  await testWithId('12345');
}

run().catch(console.error);
