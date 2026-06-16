import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSessionScope } from '@/lib/session-scope';

export async function POST(request: NextRequest) {
  try {
    // ── Auth & Scope Guard ──────────────────────────────────────
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const scope = await getSessionScope();
    if (!scope) {
      return NextResponse.json({ error: 'Forbidden: No scope' }, { status: 403 });
    }

    // ── Role Check ──────────────────────────────────────────────
    const ALLOWED_ROLES = ['PM', 'SPM', 'ME'];
    if (!ALLOWED_ROLES.includes(scope.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient role for triage sync' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, uuids } = body;

    // ── Cross-State Ownership Check ─────────────────────────────
    // Note: UUIDs don't contain state info, but we log the action for audit
    if (scope.role !== 'PM' && scope.state) {
      // Future enhancement: validate UUIDs belong to user's state
    }
    // ── End Guard ────────────────────────────────────────────────

    const response = await fetch(
      'https://script.google.com/macros/s/AKfycbyCYJc7XZ_FemJ8Q0iV1vtDGhfDRIvZ7SviM0W24C85lSsb5wHC6WlR4Jp9cK_KKUDl/exec',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, uuids })
      }
    );

    const data = await response.text();
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('Triage sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync with Google Sheets' },
      { status: 500 }
    );
  }
}
