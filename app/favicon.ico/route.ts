import { NextResponse } from 'next/server';

export async function GET() {
  // Redirect favicon requests to the logo
  return NextResponse.redirect(new URL('/Images/Logo/AllianceIndia-Logo.png', process.env.NEXTAUTH_URL || 'http://localhost:3000'));
}
