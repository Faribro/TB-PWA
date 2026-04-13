/**
 * lib/ocr/geminiExtractor.ts
 *
 * Production-grade VLM extraction engine for handwritten Indian health registers.
 * Uses Gemini 1.5 Pro with multi-pass extraction strategy for maximum accuracy.
 */

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { keyPool } from "@/lib/gemini/KeyPool";
import { preprocessRegisterImage, type PreprocessResult, type ImageProfile } from "./imagePreprocessor";
import sharp from 'sharp';

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
  preprocessing?: {
    applied: boolean;
    profile: string;
    scaleFactor: number;
    passUsed: 1 | 2;
    processingMs: number;
  };
}

// ═══════════════════════════════════════════════════════
// System Prompt — Forensic Medical Records Transcription
// ═══════════════════════════════════════════════════════

const EXTRACTION_PROMPT = `
You are a forensic medical records transcription engine
specialized in Indian correctional facility health registers.
Your task: extract every patient row from this register image.

═══════════════════════════════════════════
OUTPUT FORMAT — STRICT JSON ONLY
═══════════════════════════════════════════
Return ONLY a valid JSON array. No explanation, no markdown,
no code blocks. Raw JSON array starting with [ and ending with ]

[
  {
    "sno": 1,
    "name": "RAMESH KUMAR",
    "father_name": "SURESH",
    "age": 34,
    "sex": "M",
    "mobile": "9876543210",
    "confidence": 0.95
  }
]

If a field is unreadable or absent: use null (not "", not "?")
confidence: 0.0 to 1.0 per row based on YOUR certainty

═══════════════════════════════════════════
EXTRACTION RULES
═══════════════════════════════════════════

NAMES:
- Transcribe EXACTLY as written — do not correct spelling
- Use ALL CAPS
- Include full name: first + middle + last if visible
- Father/husband name after "S/O" or "W/O": include in father_name
  e.g. "RAMESH KUMAR S/O SURESH" → name: "RAMESH KUMAR", father_name: "SURESH"
- If name has strikethrough: read text BENEATH the strike
- Skip rows where name cell is empty or contains only dashes

AGE:
- Integer only (1–120). If written as "30 yrs" → 30
- "0", ">120", blank → null
- Letter "o" mistaken for zero: "3o" → 30

SEX / GENDER:
- Normalize ALL variations to "M" or "F"
- Male indicators: M, Male, पु, पुरुष, Purush → "M"
- Female indicators: F, Female, स्त्री, Mahila, W → "F"
- Unknown/blank → null

MOBILE:
- Indian format: exactly 10 digits, starting with 6, 7, 8, or 9
- Strip spaces, dashes, +91, 0 prefix: "091-98765 43210" → "9876543210"
- If 9 digits visible and first digit likely 9/8/7/6: attempt recovery
- Not a valid Indian mobile → null
- Do NOT store landlines (starting 0, 11 digits with 0)

WARD / ADDRESS:
- Extract as written, ALL CAPS
- If blank: null

CONFIDENCE per row:
- 0.95–1.0: Every field clearly readable
- 0.80–0.94: Name clear, one field uncertain
- 0.60–0.79: Name readable, multiple fields guessed
- 0.40–0.59: Name partially readable, heavy inference used
- 0.0–0.39: Name barely legible — still include but flag low

═══════════════════════════════════════════
INDIA-SPECIFIC CHARACTER PATTERNS
═══════════════════════════════════════════

Numbers:
- "1" looks like "7" or "l" in Hindi registers
- "0" looks like "O" or "D"
- Age "30" written as "3o" (letter o not zero)
- Mobile numbers: always 10 digits starting 6-9
  If you see 9 digits, the first digit (9/8/7/6) was
  likely cut off — prepend most likely digit

Names (Indian subcontinent patterns):
- S/Sh confusion: "Shyam" ↔ "Syam"
- Retroflex confusion: "Ramesh" ↔ "Ramesh"
- Terminal "a" often silent: "Rama" ↔ "Ram"
- "v" and "w" interchangeable: "Vijay" ↔ "Wijay"
- "ph" = "f": "Phool" ↔ "Fool"
- sh ↔ s ↔ ch: "Shyam" ↔ "Syam"
- Common first names: RAM, RAJU, SURESH, MAHESH, VIJAY,
  RAMESH, RAJESH, ANIL, SUNIL, MOHAN, SOHAN, DEEPAK,
  SANTOSH, PRAKASH, GANESH, DINESH, NARESH, UMESH,
  SHYAM, LAKSHMAN, HANUMAN, BHARAT, ARVIND, RAKESH
- Common female: SUNITA, SAVITA, GEETA, SITA, REKHA,
  PUSHPA, MAMTA, ANITA, KAVITA, PRIYA, ASHA, USHA
- Common surnames: KUMAR, SINGH, SHARMA, YADAV, GUPTA,
  PRASAD, VERMA, PANDEY, MISHRA, TIWARI, DUBEY,
  KHAN, SHEIKH, ANSARI, SIDDIQUI, MALIK, QURESHI,
  DEVI, BAI, KHATOON, BEGUM

Columns:
- Age column: if value > 120 or < 1, mark as null
- Sex/Gender: M/F/Male/Female/पु/स्त्री — normalize to M/F
- Serial numbers in first column: extract as sno
- Ward/Facility: extract as ward

Handwriting artifacts:
- Strikethrough = correction — read the text UNDER
  the strike, not through it
- Underline = emphasis — extract normally
- Circled entries = flagged records — still extract

═══════════════════════════════════════════
HANDWRITING RECOVERY — APPLY IN ORDER
═══════════════════════════════════════════

When characters are ambiguous, apply these rules:

1. STROKE RECONSTRUCTION
   Incomplete letters: use surrounding strokes to infer shape
   "R" with missing leg → still R not P or K

2. INDIAN NAME CONTEXT
   Use common Indian name patterns to guess ambiguous letters

3. CHARACTER CONFUSION PAIRS (Indian registers)
   1 ↔ l ↔ I ↔ 7    (especially in ages and IDs)
   0 ↔ O ↔ D ↔ Q    (in mobile numbers)
   n ↔ m ↔ ri       (cursive overlap)
   v ↔ w ↔ u        (Hindi transliteration)
   ph ↔ f           (Phool = Fool)
   sh ↔ s ↔ ch      (Shyam = Syam)
   a ↔ o ↔ u        (vowel ambiguity in faded ink)

4. CROSS-ROW VALIDATION
   If unsure about a name, check rows above/below for
   pattern (same family, same barrack, sequential entries)

5. FAINT INK RECOVERY
   Trace the impression/indentation even if ink is gone
   Use context of partial strokes visible at edges

6. TABLE STRUCTURE AWARENESS
   Use column position to determine data type
   Column 1: serial number (sno)
   Column 2–3: name (wide column)
   Column 4: father_name
   Column 5: age (narrow, 2 digits)
   Column 6: sex (single char)
   Column 7+: mobile, ward, address

═══════════════════════════════════════════
WHAT TO SKIP
═══════════════════════════════════════════
DO NOT extract:
- Header row (Name / Age / Mobile / etc.)
- Total / Sub-total rows
- Empty rows
- Rows with only serial numbers
- Facility name / date / signature rows
- Column labels in any language

═══════════════════════════════════════════
MULTI-PAGE / MULTI-TABLE
═══════════════════════════════════════════
If image contains multiple tables or pages:
- Extract ALL rows from ALL tables
- Do not deduplicate (keep duplicates if genuinely present)
- Maintain original row order top-to-bottom, left-to-right

═══════════════════════════════════════════
FINAL CHECK BEFORE RESPONDING
═══════════════════════════════════════════
Before outputting, verify:
□ Output is valid JSON array only — no other text
□ Every row has at least: sno (not null)
□ Ages are integers or null — never strings
□ Mobile numbers are exactly 10 digits or null
□ Sex values are only "M", "F", or null
□ No header row included in output
□ All rows from image are captured — nothing skipped
`;

// ═══════════════════════════════════════════════════════
// Gemini Response Schema (structured JSON output)
// ═══════════════════════════════════════════════════════

const RESPONSE_SCHEMA = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      name: { type: SchemaType.STRING },
      age: { type: SchemaType.INTEGER },
      sex: { type: SchemaType.STRING },
      mobile: { type: SchemaType.STRING },
      confidence: { type: SchemaType.NUMBER },
    },
    required: ['name', 'confidence'],
  },
};

// ═══════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════

function extractJsonArray(rawText: string): any[] {
  // Remove markdown code blocks if Gemini adds them
  let cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  // Find the first [ and last ] to extract array
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      `Gemini response contains no JSON array. ` +
      `Raw: ${rawText.slice(0, 200)}`
    );
  }

  const jsonStr = cleaned.slice(start, end + 1);

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      throw new Error('Parsed value is not an array');
    }
    return parsed;
  } catch (parseErr: any) {
    // Attempt to salvage by removing trailing comma before ]
    const fixed = jsonStr.replace(/,\s*]$/, ']');
    try {
      return JSON.parse(fixed);
    } catch {
      throw new Error(
        `JSON parse failed: ${parseErr.message}. ` +
        `Raw (first 500): ${jsonStr.slice(0, 500)}`
      );
    }
  }
}

function validateRow(raw: any, index: number): ExtractedRow | null {
  const name = raw?.name?.toString().trim().toUpperCase();
  if (!name || name.length < 2) return null; // skip nameless

  const age = typeof raw.age === 'number' &&
    raw.age > 0 && raw.age <= 120
    ? Math.round(raw.age)
    : null;

  const mobile = typeof raw.mobile === 'string' &&
    /^[6-9]\d{9}$/.test(raw.mobile)
    ? raw.mobile
    : null;

  const confidence = typeof raw.confidence === 'number'
    ? Math.min(1, Math.max(0, raw.confidence))
    : 0.5; // default if Gemini omits it

  return {
    sno: raw.sno ?? (index + 1),
    name: name,
    father_name: raw.father_name?.toString().trim().toUpperCase() || null,
    age: age ?? null,
    ward: raw.ward?.toString().trim().toUpperCase() || null,
    address: raw.address?.toString().trim().toUpperCase() || null,
    mobile: mobile ?? null,
    confidence_score: confidence,
  };
}

async function callGeminiExtract(
  buffer: Buffer,
  mimeType: string,
  acquired: any
): Promise<{ rows: ExtractedRow[]; confidence: number }> {
  const genAI = new GoogleGenerativeAI(acquired.apiKey);

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    generationConfig: {
      temperature: 0.05,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA as any,
    },
    systemInstruction: mimeType === 'application/pdf'
      ? `This is a multi-page PDF register document from an Indian correctional facility or health camp. Extract ALL patient records across ALL pages. Use the exact formatting rules defined. Include every row — do not summarize or skip any records.\n${EXTRACTION_PROMPT}`
      : EXTRACTION_PROMPT,
  });

  const result = await model.generateContent([
    {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType: mimeType as any,
      },
    },
  ]);

  const text = result.response.text();
  const rawRows = extractJsonArray(text);

  const rows = rawRows
    .map((r, i) => validateRow(r, i))
    .filter((r): r is ExtractedRow => r !== null);

  // Calculate average confidence
  const avgConfidence = rows.length > 0
    ? rows.reduce((sum, r) => sum + r.confidence_score, 0) / rows.length
    : 0;

  return { rows, confidence: avgConfidence };
}

// ═══════════════════════════════════════════════════════
// Main Extraction Function
// ═══════════════════════════════════════════════════════

/**
 * Extracts patient data from a handwritten register image using multi-pass strategy.
 */
export async function extractRegisterImage(
  buffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<ExtractionResult> {
  const startTime = Date.now();

  const supportedMimes = [
    'image/jpeg', 'image/png', 'image/webp',
    'image/heic', 'image/heif',
    'application/pdf'
  ];
  if (!supportedMimes.includes(mimeType)) {
    throw new Error(`Gemini does not support MIME: ${mimeType}`);
  }

  // Pass 1: preprocessed image → Gemini
  let preprocessResult: PreprocessResult | null = null;
  let workingBuffer = buffer;
  let workingMime = mimeType;
  let passUsed: 1 | 2 = 1;

  if (mimeType !== 'application/pdf') {
    try {
      preprocessResult = await preprocessRegisterImage(buffer, mimeType);
      workingBuffer = preprocessResult.buffer;
      workingMime = 'image/png'; // always PNG after processing
      console.log(
        `[geminiExtractor] Preprocessed: ${preprocessResult.profile} ` +
        `profile, ${preprocessResult.processingMs}ms`
      );
    } catch (prepErr) {
      console.warn('[geminiExtractor] Preprocessing failed, using original buffer:', prepErr);
    }
  }

  // File size guard - Gemini inline data limit is 20MB base64 (~15MB raw)
  const base64Size = workingBuffer.length * 1.33;
  if (base64Size > 15 * 1024 * 1024) {
    console.warn(
      `[geminiExtractor] Buffer too large (${
        (workingBuffer.length / 1024 / 1024).toFixed(1)
      }MB), recompressing...`
    );
    workingBuffer = await sharp(workingBuffer)
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();
    workingMime = 'image/jpeg';
  }

  // Acquire a key from the round-robin pool
  const acquired = await keyPool.acquire();

  try {
    // Pass 1: extract with preprocessed/original buffer
    const pass1 = await callGeminiExtract(workingBuffer, workingMime, acquired);

    // If confidence is acceptable or PDF, return immediately
    if (pass1.confidence >= 0.70 || mimeType === 'application/pdf') {
      await acquired.release(false);

      return {
        rows: pass1.rows,
        modelVersion: "gemini-1.5-pro",
        latencyMs: Date.now() - startTime,
        keyIndex: acquired.keyIndex,
        preprocessing: preprocessResult ? {
          applied: true,
          profile: preprocessResult.profile,
          scaleFactor: preprocessResult.processedDimensions.width / preprocessResult.originalDimensions.width,
          passUsed: 1,
          processingMs: preprocessResult.processingMs,
        } : undefined,
      };
    }

    // Pass 2: retry with ORIGINAL unprocessed buffer
    // (sometimes preprocessing hurts cursive/overlapping text)
    console.log(
      `[geminiExtractor] Pass 1 confidence: ${pass1.confidence}, ` +
      `retrying with original buffer...`
    );
    passUsed = 2;
    const pass2 = await callGeminiExtract(buffer, mimeType, acquired);

    // Return the higher confidence result
    if (pass2.confidence > pass1.confidence) {
      console.log(
        `[geminiExtractor] Pass 2 better: ` +
        `${pass2.confidence} > ${pass1.confidence}`
      );
      await acquired.release(false);

      return {
        rows: pass2.rows,
        modelVersion: "gemini-1.5-pro",
        latencyMs: Date.now() - startTime,
        keyIndex: acquired.keyIndex,
        preprocessing: {
          applied: false,
          profile: 'none',
          scaleFactor: 1,
          passUsed: 2,
          processingMs: 0,
        },
      };
    }

    await acquired.release(false);

    return {
      rows: pass1.rows,
      modelVersion: "gemini-1.5-pro",
      latencyMs: Date.now() - startTime,
      keyIndex: acquired.keyIndex,
      preprocessing: preprocessResult ? {
        applied: true,
        profile: preprocessResult.profile,
        scaleFactor: preprocessResult.processedDimensions.width / preprocessResult.originalDimensions.width,
        passUsed: 1,
        processingMs: preprocessResult.processingMs,
      } : undefined,
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
        `[geminiExtractor] Key ${acquired.keyIndex} rate-limited, retrying with next key...`
      );
      return extractRegisterImage(buffer, mimeType);
    }

    throw error;
  }
}

/**
 * Validates and sanitizes extracted rows.
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
