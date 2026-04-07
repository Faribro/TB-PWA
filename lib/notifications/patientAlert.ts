/**
 * lib/notifications/patientAlert.ts
 *
 * Bilingual (Hindi/English) patient notification system.
 *
 * Email: Uses Google Apps Script webhook to send via Gmail.
 * WhatsApp: Placeholder ready for META Business API integration.
 */

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════

export interface PatientAlertPayload {
  patientName: string;
  fatherName?: string | null;
  age?: number | null;
  mobile?: string | null;
  facility?: string | null;
  staffName?: string | null;
  matchStatus: "auto_match" | "needs_review" | "new_record";
  matchedPatientName?: string | null;
  confidenceScore?: number;
  action: "linked" | "created" | "flagged";
}

// ═══════════════════════════════════════════════════════
// Google Apps Script Email Integration
// ═══════════════════════════════════════════════════════

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwtZcGlvRNIJ8dCu3xgzfaXl4EQZUSgcc6EeFy8rwjkQ7ynkJnMYivtqyl-1y_y_rE/exec";

/**
 * Generates a bilingual (Hindi + English) email body for patient triage alerts.
 */
function buildBilingualEmailBody(alert: PatientAlertPayload): string {
  const statusEmoji =
    alert.matchStatus === "auto_match"
      ? "🟢"
      : alert.matchStatus === "needs_review"
        ? "🟡"
        : "🔴";

  const statusHindi =
    alert.matchStatus === "auto_match"
      ? "स्वतः मिलान"
      : alert.matchStatus === "needs_review"
        ? "समीक्षा आवश्यक"
        : "नया रिकॉर्ड";

  const statusEnglish =
    alert.matchStatus === "auto_match"
      ? "Auto-Matched"
      : alert.matchStatus === "needs_review"
        ? "Needs Review"
        : "New Record";

  const actionHindi =
    alert.action === "linked"
      ? "मौजूदा रिकॉर्ड से जोड़ा गया"
      : alert.action === "created"
        ? "नया रिकॉर्ड बनाया गया"
        : "समीक्षा के लिए चिह्नित";

  const actionEnglish =
    alert.action === "linked"
      ? "Linked to existing record"
      : alert.action === "created"
        ? "New record created"
        : "Flagged for review";

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${statusEmoji} SAMADHAAN — Patient Triage Alert
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏥 रोगी विवरण / Patient Details
─────────────────────────────────
नाम / Name: ${alert.patientName}
${alert.fatherName ? `पिता/पति / Father/Husband: ${alert.fatherName}` : ""}
${alert.age ? `आयु / Age: ${alert.age}` : ""}
${alert.mobile ? `संपर्क / Contact: ${alert.mobile}` : ""}
${alert.facility ? `सुविधा / Facility: ${alert.facility}` : ""}

📋 मिलान स्थिति / Match Status
─────────────────────────────────
${statusEmoji} ${statusHindi} / ${statusEnglish}
${alert.confidenceScore != null ? `विश्वास / Confidence: ${(alert.confidenceScore * 100).toFixed(0)}%` : ""}
${alert.matchedPatientName ? `मिलान / Matched With: ${alert.matchedPatientName}` : ""}

✅ कार्रवाई / Action Taken
─────────────────────────────────
${actionHindi} / ${actionEnglish}

${alert.staffName ? `📝 कर्मचारी / Staff: ${alert.staffName}` : ""}
📅 दिनांक / Date: ${new Date().toLocaleDateString("hi-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })} (${new Date().toLocaleDateString("en-IN")})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
यह एक स्वचालित सूचना है / This is an automated notification
SAMADHAAN Track & Chase Platform
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
}

/**
 * Sends a bilingual patient alert email via Gmail using Google Apps Script.
 */
export async function sendEmailAlert(
  recipientEmail: string,
  alert: PatientAlertPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const subject = `[SAMADHAAN] ${
      alert.matchStatus === "auto_match"
        ? "🟢 Auto-Match"
        : alert.matchStatus === "needs_review"
          ? "🟡 Review Required"
          : "🔴 New Record"
    } — ${alert.patientName}`;

    const body = buildBilingualEmailBody(alert);

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sendEmail",
        to: recipientEmail,
        subject,
        body,
        // Apps Script can also accept HTML body
        htmlBody: body.replace(/\n/g, "<br>"),
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      return { success: false, error: `Gmail API error: ${errText}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Email send failed",
    };
  }
}

// ═══════════════════════════════════════════════════════
// WhatsApp Business API Placeholder
// ═══════════════════════════════════════════════════════

/**
 * WhatsApp alert sender — ready for META Business API integration.
 *
 * To activate:
 * 1. Set META_API_TOKEN in .env.local
 * 2. Configure WHATSAPP_PHONE_NUMBER_ID
 * 3. Create approved template in Meta Business Manager
 *
 * @param recipientPhone - Indian mobile number (10 digits, no country code)
 * @param alert - Patient alert payload
 */
export async function sendWhatsAppAlert(
  recipientPhone: string,
  alert: PatientAlertPayload
): Promise<{ success: boolean; error?: string }> {
  const META_API_TOKEN = process.env.META_API_TOKEN;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!META_API_TOKEN || !PHONE_NUMBER_ID) {
    return {
      success: false,
      error:
        "WhatsApp API not configured. Set META_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID in environment.",
    };
  }

  // Normalize Indian phone number to E.164 format
  const normalized = recipientPhone.replace(/[\s\-+]/g, "");
  const e164 = normalized.startsWith("91")
    ? `+${normalized}`
    : `+91${normalized}`;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${META_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: e164,
          type: "template",
          template: {
            name: "patient_triage_alert",
            language: { code: "hi" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: alert.patientName },
                  {
                    type: "text",
                    text:
                      alert.matchStatus === "auto_match"
                        ? "स्वतः मिलान / Auto-Matched"
                        : alert.matchStatus === "needs_review"
                          ? "समीक्षा / Review Required"
                          : "नया रिकॉर्ड / New Record",
                  },
                  {
                    type: "text",
                    text: alert.facility || "—",
                  },
                  {
                    type: "text",
                    text: new Date().toLocaleDateString("hi-IN"),
                  },
                ],
              },
            ],
          },
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `WhatsApp API error: ${JSON.stringify(errBody)}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "WhatsApp send failed",
    };
  }
}

/**
 * Batch notification sender — sends both email and WhatsApp alerts.
 */
export async function sendPatientAlerts(params: {
  email?: string;
  phone?: string;
  alert: PatientAlertPayload;
}): Promise<{
  email: { sent: boolean; error?: string };
  whatsapp: { sent: boolean; error?: string };
}> {
  const results = {
    email: { sent: false } as { sent: boolean; error?: string },
    whatsapp: { sent: false } as { sent: boolean; error?: string },
  };

  if (params.email) {
    const emailResult = await sendEmailAlert(params.email, params.alert);
    results.email = {
      sent: emailResult.success,
      error: emailResult.error,
    };
  }

  if (params.phone) {
    const waResult = await sendWhatsAppAlert(params.phone, params.alert);
    results.whatsapp = {
      sent: waResult.success,
      error: waResult.error,
    };
  }

  return results;
}
