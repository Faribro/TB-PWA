# Architectural & Structural Audit Report — SAMADHAAN Ingestion Pipeline

**Date:** June 12, 2026  
**Status:** Read-Only Diagnostic Phase (Phase 0 - 5 Complete)  
**Target Platform:** Next.js 15 / React 19 / Supabase (PostgreSQL) / Upstash Redis / Google Apps Script

---

## 1. Executive Summary

This audit report delivers a deep-dive diagnostic assessment of the SAMADHAAN TB Surveillance platform’s data ingestion, matching, and synchronization layers. All analyses were conducted in a **read-only** manner. 

Three primary issues were investigated:
1. **Google Sheets Sync Failures:** Staged resolutions fail to sync, showing `Missing kobo_uuid/_uuid field` errors in Google Apps Script logs.
2. **Navigation State Loss:** Navigation from the Vertex dashboard to the staging terminal and clicking the "Back" button results in losing the active facility inmate sheet view context.
3. **Ingestion Terminal Buckets:** The staging terminal requires reorganization into four distinct, logical categories: New Entries, Conflicts, Existing Entries, and Sync Failures.

Additionally, critical database/codebase discrepancies were uncovered (e.g., missing database columns referenced in API routes) which pose execution-breaking risks.

---

## 2. Phase-by-Phase Audit Findings

### Phase 0: Environment & Connectivity Verification
- **Supabase Connectivity:** Verified direct connectivity to the Supabase database using both pooler (`5432`) and transactional/session ports. Querying works successfully.
- **Upstash Redis Connectivity:** Direct connection established using REST configurations. Redis is active.
- **Google Sheets Webhook (Apps Script):** Hitting the webhook via POST returns `Status 200` but fetch operations return `Invalid payload format. Expected: { batch: [...] }`. This is because the currently deployed Apps Script expects `batch` arrays for reconciliation and has no route handler for `action: 'fetch'`.

### Phase 1: Database Schema & Indexing Audit
- **Primary Patient Table:** `patients` table verified. `id` is a `UUID` primary key.
- **Column Aliases:** Patient name is mapped to `inmate_name`, contact number is `contact_number`, and facility is `facility_name`.
- **Critical Mismatches Found:**
  - `serial_no` (or `serial_number`) is **not** present in the PostgreSQL table or `prisma.schema`.
  - `facility_id` is **not** present in the database.
- **Prisma Schema Alignment:** `prisma/schema.prisma` aligns with the database.
- **Trigram Extension (`pg_trgm`):** The extension is installed (v1.6), but **no trigram indexes (`gist` or `gin`) exist** on `inmate_name` or `facility_name` in PostgreSQL. This causes probabilistic matches to run slow sequential lookups.
- **Unique Indexes:** A unique index exists on `kobo_uuid`.

### Phase 2: Field Coverage Analysis
A field coverage scan was executed across **36,166 records** in the `patients` table:
- `inmate_name` (99.92% populated)
- `father_husband_name` (99.54% populated)
- `screening_date` (99.89% populated)
- `facility_name` (99.90% populated)
- `age` (99.85% populated)
- `unique_id` (56.32% populated)
- `date_of_birth` (52.89% populated)
- `contact_number` (26.22% populated)

*Observation:* Unique ID and DOB have high null rates, meaning the probabilistic matching layer must rely on fuzzy string matches (Name + Facility) rather than direct ID checks.

### Phase 3: Data Quality Audit
An audit of the existing 36,166 records revealed:
- **Exact Duplicate Groups:** 120 groups of duplicates exist.
- **Shared Phone Numbers:** 209 phone numbers are shared across multiple records. The fallback number `0000000000` occurs **277 times**.
- **DOB vs. Age Mismatch:** 690 records have a discrepancy where `date_of_birth` does not match the recorded `age`.
- **Nameless Records:** 30 records have missing or blank names.

### Phase 4: Redis Quarantine Audit
- **Quarantine Hash (`quarantine:records`):** The hash currently contains **0 records**.
- **Persistence Check:** The hash has no TTL (Time-To-Live) configured, meaning staged records remain persistent until resolved or rejected. No data loss is caused by expiration.

### Phase 5: Codebase Audit & Gap Analysis
1. **Bulk Upload Design Bug (`/api/bulk-upload/route.ts`):**
   - The bulk upload endpoint uses:
     ```typescript
     .upsert(chunk, { onConflict: 'serial_no' })
     ```
   - Since `serial_no` does not exist in the database, **any conflict during bulk uploads will trigger a database crash (PostgreSQL error)**.
2. **Missing `kobo_uuid` in Reconciliation Sync:**
   - In `/api/quarantine/resolve/route.ts`, the payload sent to Google Sheets Apps Script contains `id`, but **completely lacks `kobo_uuid` or `_uuid` at the root**.
   - The Google Apps Script `handleBatchOperation_` code requires:
     ```javascript
     var koboUuid = record.kobo_uuid || record.KoboUUID || record._uuid;
     if (!koboUuid) { errors++; continue; }
     ```
   - Because `kobo_uuid` is missing, **100% of reconciliations are skipped by Google Sheets, resulting in a sync count of 0.**
3. **Probabilistic Matching Logic:**
   - Score boundaries: High match $\ge 0.85$ (auto-synchronized), Ambiguous conflict $\ge 0.65$ (staged for review), Low match $< 0.65$ (new entry).
   - The matching engine returns a `candidate_match` object, but it only includes the Supabase `id` (UUID), **omitting the existing `kobo_uuid`**. This prevents the resolver from knowing the target Google Sheets row key for updates.

---

## 3. Recommended Actions & Fixes

### Fix 1: Google Sheets Batch Sync Validation Failure
To enable successful syncs, the Next.js app must pass `kobo_uuid` at the root of batch entries sent to the Apps Script.
1. **Extend `CandidateMatch` Type:** Add optional `kobo_uuid: string | null` to the `CandidateMatch` interface in `types/ingestion.ts`.
2. **Update Matcher (`lib/ingestion/matching/probabilistic.ts`):** Map the existing patient's `kobo_uuid` into the returned `candidate_match` object.
3. **Update Resolver Route (`app/api/quarantine/resolve/route.ts`):**
   - For `MERGE_CANDIDATE` (Updates): Map `kobo_uuid` to `record.candidate_match.kobo_uuid`.
   - For `APPROVE_NEW` (Inserts): Generate a `kobo_uuid` using `record.id` (which is a valid UUID).
   - Inject `kobo_uuid` into the root of each object in `recordsToSync`.

### Fix 2: Staging Terminal Navigation State Rehydration
1. **Modal Parameter Hand-off (`components/RegisterUploadModal.tsx`):**
   - Pass the active facility name, screening date, state, and district as query parameters when redirecting to `/dashboard/vertex/ingestion`:
     `?date=${screeningDate}&facility=${facilityName}&state=${screeningState}&district=${screeningDistrict}`
2. **Terminal Back Button URL (`app/dashboard/vertex/ingestion/page.tsx`):**
   - Extract the query parameters on mount and build a dynamic Back URL that redirects to:
     `/dashboard/vertex?date=${date}&facility=${facility}&state=${state}&district=${district}`
3. **Vertex Dashboard State Restoration (`components/Vertex.tsx`):**
   - Read the parameters from `window.location.search`.
   - If present, update `selectedDate` and `selectedFacility` state, triggering the UI to automatically reopen the corresponding facility inmate list sheet.

### Fix 3: Ingestion Terminal Buckets Reorganization
Re-arrange the tabs and stats cards in `app/dashboard/vertex/ingestion/page.tsx` into four distinct buckets:
1. **Bucket A: New Entries** (Staged new records: `confidence_score === 'low' && quarantine_status !== 'FAILED_RETRY'`)
2. **Bucket B: Conflicts** (Ambiguous matches: `confidence_score === 'medium' && quarantine_status !== 'FAILED_RETRY'`)
3. **Bucket C: Existing Entries** (Auto-reconciled matches: `confidence_score === 'high' && quarantine_status !== 'FAILED_RETRY'`)
4. **Bucket D: Sync Failures** (Failed API updates: `quarantine_status === 'FAILED_RETRY'`)

---

## 4. Architectural Notes (For User Consideration)

> [!WARNING]
> **Prisma Mismatch & Upsert Crash Risk:**
> The `serial_no` conflict-target bug in `/api/bulk-upload/route.ts` is a ticking bomb. If users perform bulk uploads that trigger duplicate checks, the app will throw database constraint violations. We recommend modifying the conflict target in `/api/bulk-upload/route.ts` from `serial_no` to `kobo_uuid` (or removing the manual upsert mapping) to prevent production database exceptions.

> [!NOTE]
> **Probabilistic Matching Source of Truth:**
> The Next.js worker currently fetches existing patients from the Google Sheets Apps Script `/fetch` endpoint to perform matching. However, as noted, Apps Script fetch operations are slow and prone to timeouts. Matching against the local Supabase `patients` table (scoped to the same state/district) would be much more robust, faster, and self-contained. Since we are sync-mirroring Sheets to Supabase, matching against Supabase is functionally equivalent but architecturally superior. We recommend keeping the Sheets fetch fallback but prioritizing direct database matches.
