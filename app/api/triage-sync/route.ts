import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, uuids } = body;

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
