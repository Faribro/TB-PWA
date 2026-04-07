/**
 * lib/ocr/geminiExtractor.ts
 *
 * VLM (Vision Language Model) extraction engine for handwritten Indian health registers.
 * Uses Gemini 2.0 Flash with forensic-grade system prompt for accurate transcription
 * of multilingual, cursive handwriting from TB/RNTCP registers.
 *
 * Key design decisions:
 * - temperature: 0.05 (near-deterministic — critical for transcription accuracy)
 * - topP: 0.92, topK: 20 (tight nucleus to prevent creative deviation)
 * - Uses existing KeyPool for 11-key round-robin with 429 cooldown
 * - Zero dictionary autocorrect on Indian proper names
 */

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { keyPool } from "@/lib/gemini/KeyPool";

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════

export interface ExtractedRow {
  sno: number | null;
  name: string | null;
  father_name: string | null;
  age: number | null;
  ward: string | null;
  address: string | null;
  mobile: string | null;
  confidence_score: number;
}

export interface ExtractionResult {
  rows: ExtractedRow[];
  modelVersion: string;
  latencyMs: number;
  keyIndex: number;
}

// ═══════════════════════════════════════════════════════
// System Prompt — Forensic Document Examiner
// ═══════════════════════════════════════════════════════

const SYSTEM_PROMPT = `
You are a world-class forensic document examiner and medical data extraction engine.
Your task is to extract tabular patient data from uploaded images of handwritten public
health registers used in Indian government health programs (TB, RNTCP, PMTB, etc.).

═══════════════════════════════════════════════════════
UNDERSTANDING YOUR DOCUMENT
═══════════════════════════════════════════════════════
- The register is a hand-ruled table on unlined or loosely ruled paper.
- Handwriting is often cursive, overlapping, faint, or smudged.
- The document is MULTILINGUAL:
    • S.No and all numeric data (Age, Mobile) are written in ENGLISH/ARABIC numerals.
    • Names and Addresses are INDIAN NAMES written in the LATIN alphabet (English script).
    • Some registers may contain Devanagari (Hindi script) — preserve it exactly.

═══════════════════════════════════════════════════════
CRITICAL EXTRACTION RULES — FAILURE IS NOT AN OPTION
═══════════════════════════════════════════════════════

RULE 1 — ZERO DICTIONARY AUTOCORRECT ON NAMES:
When reading a Name or Father's Name cell, you are performing VISUAL TRANSCRIPTION
only. You are NOT a spell-checker. The vocabulary is INDIAN PROPER NAMES — not
English dictionary words. If a name looks like "Bhavna", write "Bhavna" even if
your internal model suggests "Banana". If it looks like "Ramish", write "Ramish",
even if "Ramesh" seems more likely. Only correct isolated numeral confusions
(e.g., digit 0 vs letter O, digit 1 vs letter l).

RULE 2 — THE NAME | FATHER SPLIT:
The Name column often combines Patient Name and Father's Name in one cell, separated
by a vertical bar '|', a Devanagari '।' (dandā), a slash '/', or the word 'S/O'.
Split these intelligently. Examples:
  "Rajesh Yadav | Ramlal" → name: "Rajesh Yadav", father_name: "Ramlal"
  "Priya S/O Dinesh"      → name: "Priya", father_name: "Dinesh"
  "Mohan / Sohan Lal"     → name: "Mohan", father_name: "Sohan Lal"

RULE 3 — SPATIAL ANCHORING ON S.NO:
Use the Serial Number (S.No) column as your row anchor. Every new S.No integer
defines a new patient row. Read ALL columns HORIZONTALLY from that S.No baseline.
Do not let a tall cell in one column merge data across row boundaries.

RULE 4 — NUMERIC STRICTNESS:
- Age: Extract as integer. Typical range 1–99. If illegible, return null.
- Mobile: Must be exactly 10 digits (Indian format). Strip spaces/dashes.
  Common OCR confusions to correct: digit 0 ↔ letter O, digit 1 ↔ letter l or I,
  digit 5 ↔ letter S. Apply ONLY to the numeric mobile field, not to name fields.
  If fewer than 7 digits are readable, return null.
- S.No: Integer only.

RULE 5 — CONFIDENCE SCORING (per row):
Provide a "confidence_score" float (0.00–1.00):
  0.90–1.00: All fields clearly legible with high certainty.
  0.60–0.89: Mostly clear; 1–2 ambiguous characters interpolated from context.
  0.30–0.59: Several fields guessed; reader should verify.
  0.00–0.29: Severely illegible; most fields are uncertain reconstructions.

RULE 6 — NULL DISCIPLINE:
Return null for a field ONLY when genuinely unreadable after your best effort.
Never omit a field key from the JSON object. A row with S.No but all other nulls
is valid — it signals a blank or skipped row to the human reviewer.

RULE 7 — IGNORE SIGNATURE COLUMN:
If a "Signature" or "Sign" column is present, skip it entirely. Do not include it.

═══════════════════════════════════════════════════════
OUTPUT FORMAT — STRICT
═══════════════════════════════════════════════════════
Return ONLY a valid JSON array. No markdown, no backticks, no preamble, no explanation.
Begin your response with the '[' character.

Each element must match this exact schema:
{
  "sno":               <integer | null>,
  "name":              <string | null>,   // Patient name as visually seen
  "father_name":       <string | null>,   // Father's name as visually seen
  "age":               <integer | null>,
  "ward":              <string | null>,
  "address":           <string | null>,
  "mobile":            <string | null>,   // 10-digit string
  "confidence_score":  <float>            // 0.00–1.00
}
`;

// ═══════════════════════════════════════════════════════
// Gemini Response Schema (structured JSON output)
// ═══════════════════════════════════════════════════════

const RESPONSE_SCHEMA = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      sno:              { type: SchemaType.INTEGER },
      name:             { type: SchemaType.STRING  },
      father_name:      { type: SchemaType.STRING  },
      age:              { type: SchemaType.INTEGER },
      ward:             { type: SchemaType.STRING  },
      address:          { type: SchemaType.STRING  },
      mobile:           { type: SchemaType.STRING  },
      confidence_score: { type: SchemaType.NUMBER  },
    },
    required: ["sno", "confidence_score"],
  },
};

// ═══════════════════════════════════════════════════════
// Main Extraction Function
// ═══════════════════════════════════════════════════════

/**
 * Extracts patient data from a handwritten register image using Gemini VLM.
 *
 * @param imageBuffer - Raw image bytes
 * @param mime - MIME type (image/jpeg, image/png, image/webp)
 * @returns Parsed array of extracted patient rows with confidence scores
 */
export async function extractRegisterImage(
  imageBuffer: Buffer,
  mime: string
): Promise<ExtractionResult> {
  const startTime = Date.now();

  // Acquire a key from the round-robin pool
  const acquired = await keyPool.acquire();

  try {
    const genAI = new GoogleGenerativeAI(acquired.apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.05,
        topP: 0.92,
        topK: 20,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA as any,
      },
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent([
      {
        inlineData: {
          data: imageBuffer.toString("base64"),
          mimeType: mime as any,
        },
      },
    ]);

    const text = result.response.text();
    const rows: ExtractedRow[] = JSON.parse(text);

    // Release key — not rate limited
    await acquired.release(false);

    return {
      rows,
      modelVersion: "gemini-2.0-flash",
      latencyMs: Date.now() - startTime,
      keyIndex: acquired.keyIndex,
    };
  } catch (error: any) {
    // Check if this was a rate limit error (429)
    const isRateLimit =
      error?.status === 429 ||
      error?.message?.includes("429") ||
      error?.message?.includes("RESOURCE_EXHAUSTED");

    await acquired.release(isRateLimit);

    // If rate limited, retry once with a new key
    if (isRateLimit) {
      console.warn(
        `[VLM] Key ${acquired.keyIndex} rate-limited, retrying with next key...`
      );
      return extractRegisterImage(imageBuffer, mime);
    }

    throw error;
  }
}

/**
 * Validates and sanitizes extracted rows.
 * - Strips names with only whitespace
 * - Validates mobile numbers (10 digits)
 * - Clamps confidence scores to [0, 1]
 */
export function sanitizeExtractedRows(rows: ExtractedRow[]): ExtractedRow[] {
  return rows.map((row) => ({
    ...row,
    name: row.name?.trim() || null,
    father_name: row.father_name?.trim() || null,
    ward: row.ward?.trim() || null,
    address: row.address?.trim() || null,
    mobile: row.mobile
      ? /^\d{10}$/.test(row.mobile.replace(/[\s\-]/g, ""))
        ? row.mobile.replace(/[\s\-]/g, "")
        : null
      : null,
    age:
      row.age !== null && row.age >= 0 && row.age <= 120 ? row.age : null,
    confidence_score: Math.max(0, Math.min(1, row.confidence_score ?? 0)),
  }));
}
