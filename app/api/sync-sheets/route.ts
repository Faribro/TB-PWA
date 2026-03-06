import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

const SHEETS = ['Patient Linelist_TB', 'Master_Database_TB'];
const ID_COLUMN = 'A';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { uniqueId, field, value } = payload;

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

    const fieldColumnMap: Record<string, string> = {
      'referral_date': 'K',
      'tb_diagnosed': 'L',
      'att_start_date': 'N',
      'xray_result': 'G'
    };

    const column = fieldColumnMap[field];
    if (!column) {
      return NextResponse.json({ error: 'Unknown field' }, { status: 400 });
    }

    for (const sheetName of SHEETS) {
      const searchResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!${ID_COLUMN}:${ID_COLUMN}`
      });

      const rows = searchResponse.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === uniqueId);

      if (rowIndex !== -1) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!${column}${rowIndex + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[value]] }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Sheets sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
