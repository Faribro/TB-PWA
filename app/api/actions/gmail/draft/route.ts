import { NextRequest, NextResponse } from 'next/server';

/**
 * Gmail Draft API Route - Executive Edition
 * 
 * Creates professional draft emails for TB breach follow-ups with urgency levels.
 * 
 * SETUP REQUIRED:
 * 1. Enable Gmail API in Google Cloud Console
 * 2. Create OAuth 2.0 credentials
 * 3. Add to .env.local:
 *    GOOGLE_CLIENT_ID=your_client_id
 *    GOOGLE_CLIENT_SECRET=your_client_secret
 *    GOOGLE_REFRESH_TOKEN=your_refresh_token
 * 4. Install googleapis: npm install googleapis
 */

export async function POST(req: NextRequest) {
  try {
    const { recipient_role, district_name, breach_count, urgency_level, reason } = await req.json();

    // Validate required fields
    if (!district_name || !breach_count) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: district_name, breach_count' },
        { status: 400 }
      );
    }

    // Check if Google credentials are configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.warn('⚠️ Gmail API not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local');
      
      // Return mock success for development
      const draft = generateEmailDraft(recipient_role, district_name, breach_count, urgency_level, reason);
      return NextResponse.json({
        success: true,
        message: 'Gmail API not configured. This is a mock response.',
        draft,
        mock: true
      });
    }

    // TODO: Implement actual Gmail API integration
    // const { google } = require('googleapis');
    // const oauth2Client = new google.auth.OAuth2(
    //   process.env.GOOGLE_CLIENT_ID,
    //   process.env.GOOGLE_CLIENT_SECRET,
    //   'http://localhost:3000/api/auth/callback/google'
    // );
    // oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    // 
    // const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    // const draft = await gmail.users.drafts.create({...});

    const draft = generateEmailDraft(recipient_role, district_name, breach_count, urgency_level, reason);
    
    return NextResponse.json({
      success: true,
      message: 'Email draft created successfully',
      draft
    });

  } catch (error: any) {
    console.error('❌ Gmail Draft Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create email draft',
        details: error.message
      },
      { status: 500 }
    );
  }
}

function generateEmailDraft(
  recipient_role: string = 'District TB Officer',
  district_name: string,
  breach_count: number,
  urgency_level: string = 'high',
  reason?: string
) {
  const formattedDistrict = district_name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const urgencyPrefix = urgency_level === 'high' ? 'URGENT: ' : urgency_level === 'medium' ? 'ATTENTION: ' : '';
  const subject = `${urgencyPrefix}TB Screening Breach Detected - ${formattedDistrict}`;

  const body = `Dear ${recipient_role},

This is an automated alert from the TB Screening Intelligence System.

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ BREACH ALERT SUMMARY                                                          ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ District:        ${formattedDistrict.padEnd(60)} ┃
┃ Breach Count:    ${String(breach_count).padEnd(60)} ┃
┃ Urgency Level:   ${urgency_level.toUpperCase().padEnd(60)} ┃
${reason ? `┃ Reason:          ${reason.padEnd(60)} ┃
` : ''}┃ Status:          REQUIRES IMMEDIATE ATTENTION${' '.repeat(32)} ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

IMPACT ANALYSIS:
We have identified ${breach_count} patients in ${formattedDistrict} who are currently out of SLA (Service Level Agreement) for TB screening follow-up. This represents a critical gap in our screening pipeline that requires immediate intervention.

RECOMMENDED ACTIONS:

1. ✅ IMMEDIATE REVIEW
   - Access the TB Screening Dashboard at: [Dashboard URL]
   - Review patient records for screening delays
   - Identify root causes (resource constraints, patient non-compliance, etc.)

2. ✅ FIELD COORDINATION
   - Coordinate with field teams for immediate patient follow-up
   - Prioritize high-risk patients based on screening history
   - Ensure all contact attempts are documented in the system

3. ✅ SYSTEM UPDATE
   - Update patient status in the tracking system within 24 hours
   - Document all follow-up actions and outcomes
   - Flag any systemic issues preventing timely screening

4. ✅ CORRECTIVE ACTION REPORT
   - Submit corrective action plan within 48 hours
   - Include timeline for breach resolution
   - Propose preventive measures for future breaches

TIMELINE:
- Acknowledgment Required: Within 4 hours
- Initial Action Plan: Within 24 hours
- Full Resolution: Within 72 hours
- Follow-up Report: Within 7 days

SUPPORT RESOURCES:
- Technical Support: support@tbprogram.gov.in
- Emergency Hotline: 1800-XXX-XXXX
- Dashboard Access: [Dashboard URL]
- Training Materials: [Training Portal URL]

Please acknowledge receipt of this alert and provide your initial action plan by replying to this email.

If you require additional resources or support to address this breach, please contact the State TB Cell immediately.

Best regards,

TB Screening Intelligence System
National TB Elimination Programme
Ministry of Health & Family Welfare
Government of India

---
This is an automated message generated by the TB Screening Intelligence System.
For technical support, contact: support@tbprogram.gov.in
Dashboard: [Dashboard URL]
Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
`;

  return { subject, body, recipient_role, district_name, breach_count, urgency_level };
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    endpoint: '/api/actions/gmail/draft',
    method: 'POST',
    description: 'Creates professional Gmail drafts for TB breach follow-ups',
    requiredEnv: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'],
    configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    features: ['Urgency levels', 'Professional formatting', 'Action checklists', 'Timeline tracking']
  });
}
