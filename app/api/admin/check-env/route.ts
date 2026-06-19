export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const adminSecret = req.headers.get('x-admin-secret');
  const expectedSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!adminSecret || adminSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    webhookUrl: process.env.GOOGLE_SCRIPT_WEBHOOK_URL || 'NOT SET',
    hasServiceAccountKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    serviceAccountKeyLength: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.length || 0
  });
}
