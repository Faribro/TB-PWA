# Clinical Tab Persistence Investigation

Date: 2026-05-12

## Executive Summary

The primary root cause was confirmed: clinical fields reached the save flow, but the old `/api/patient-sync` mapping accepted only snake_case and long form-label keys. Legacy flat keys such as `referredfacility`, `tbdiagnosisdate`, `attstartdate`, `hivstatus`, `artstatus`, `artnumber`, and `nikshayabhaid` were unmapped and silently produced a successful-looking no-op. Intentional clears also failed because the old mapping included fields only when `value !== undefined && value !== null && value !== ''`.

The fix adds one shared canonical clinical map, normalizes aliases centrally, includes fields based on key presence rather than truthiness, rereads the database after update, and returns that reread row. The live Supabase schema was also missing `other_facility_name`; it has now been added with an idempotent migration statement and verified.

Evidence tags: CODE PROOF, SANITIZER PROOF, MAPPING PROOF, DB PROOF, REREAD PROOF.

## Full Save Path

1. `PatientDetailDrawer` reads clinical values from react-hook-form with `getValues()`.
2. The drawer builds a payload using `CLINICAL_FORM_FIELD_TO_COLUMN`.
3. The client posts `{ patientId, updates }` to `/api/patient-sync`.
4. The API calls `sanitizePatientUpdate(updates)`.
5. The API calls `mapPatientUpdatesToDb(sanitized)`.
6. `mapPatientUpdatesToDb` resolves canonical, form-label, Kobo-style, and legacy-flat aliases to DB columns.
7. Empty strings are preserved for text columns and normalized to `null` for date/number columns.
8. Supabase updates the resolved patient by `kobo_uuid` first, then `id`.
9. The API rereads the row with `select('*')`.
10. The response returns the reread patient; the drawer updates `localPatient` and SWR from that confirmed row.

Evidence tags: CODE PROOF, REREAD PROOF.

## Field Inventory

All listed fields now survive sanitizer, mapping, and key-presence inclusion. All listed fields exist in the live schema and persisted in the final API roundtrip.

| UI section | UI label | Client form key | Client payload key | Accepted aliases tested | DB column | Schema | Persists |
|---|---|---|---|---|---|---|---|
| Sputum & Referral | Referral Date | `Date of referral for TB Examination (sputum) (dd/mm/yy)` | `referral_date` | `referral_date`, form label, `referraldate` | `referral_date` | yes | yes |
| Sputum & Referral | Referred Facility | `Name of facility where referred to (Give code/name of all facilities)` | `referred_facility` | `referred_facility`, form label, `referredfacility` | `referred_facility` | yes | yes |
| Diagnosis | TB Diagnosed | `TB diagnosed (Y/N)` | `tb_diagnosed` | `tb_diagnosed`, form label, `tbdiagnosed` | `tb_diagnosed` | yes | yes |
| Diagnosis | Date of Diagnosis | `Date of TB Diagnosed (dd/mm/yy)` | `tb_diagnosis_date` | `tb_diagnosis_date`, form label, `tbdiagnosisdate` | `tb_diagnosis_date` | yes | yes |
| Diagnosis | Type of Diagnosis | `Type of TB Diagnosed (P/EP)` | `tb_type` | `tb_type`, form label, `tbtype` | `tb_type` | yes | yes |
| Treatment | ATT Start Date | `Date of starting ATT (dd/mm/yyyy)` | `att_start_date` | `att_start_date`, form label, `attstartdate` | `att_start_date` | yes | yes |
| Treatment | ATT Completion Date | `Date of Treatment Completion (dd/mm/yyyy)` | `att_completion_date` | `att_completion_date`, form label, `attcompletiondate` | `att_completion_date` | yes | yes |
| HIV & ART Status | HIV Status | `HIV Status (Positive/Negative/Unknown)` | `hiv_status` | `hiv_status`, form label, `hivstatus` | `hiv_status` | yes | yes |
| HIV & ART Status | ART Status | `Status at the time of referral (Pre ART/On ART)` | `art_status` | `art_status`, form label, `artstatus` | `art_status` | yes | yes |
| HIV & ART Status | ART Number | `ART Number (if on ART at the time of referral)` | `art_number` | `art_number`, form label, `artnumber` | `art_number` | yes | yes |
| Nikshay & Registration | Nikshay/ABHA ID | `NIKSHAY/ABHA ID` | `nikshay_abha_id` | `nikshay_abha_id`, form label, `nikshayabhaid` | `nikshay_abha_id` | yes | yes |
| Nikshay & Registration | Registration Date | `Date of registration (dd/mm/yyyy)` | `registration_date` | `registration_date`, form label, `nikshayregistrationdate` | `registration_date` | yes | yes |
| Nikshay & Registration | Remarks | `Remarks` | `remarks` | `remarks`, form label | `remarks` | yes | yes |
| Sputum & Referral | Other Facility Name | `Other Facility Name` | `other_facility_name` | `other_facility_name`, form label, `otherfacilityname` | `other_facility_name` | yes | yes |
| Closure | Closure Reason | `closure_reason` | `closure_reason` | `closure_reason`, form key, `closurereason` | `closure_reason` | yes | yes |

Evidence tags: MAPPING PROOF, DB PROOF, REREAD PROOF.

## Sanitizer Findings

`sanitizePatientUpdate()` only strips known metadata fields such as `client_timestamp`, `_optimistic`, `_localId`, `_dirty`, `matches`, `matchStatus`, `Serial Number`, `KoboUUID`, and `KoboID`. It does not rename keys, strip unknown keys broadly, trim values, convert nulls, drop falsey values, or alter date formats.

Evidence tags: SANITIZER PROOF.

## Mapping Findings

Before the fix, legacy flat keys were not accepted. The before DB roundtrip showed 13/14 legacy-flat variants failing and 9/9 intentional clears failing. After the fix and schema migration, the final roundtrip showed 15/15 canonical snake_case, 15/15 form-label, 15/15 legacy-flat, and 10/10 intentional-clear variants persisted.

Evidence tags: MAPPING PROOF, DB PROOF, REREAD PROOF.

## Supabase Schema Verification

The live Supabase table initially did not expose `other_facility_name`, so that field was schema-skipped in `tmp/clinical-roundtrip-after-verify.json`. I applied idempotent DDL:

```sql
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS other_facility_name TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS treatment_regimen TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS closure_reason TEXT;
NOTIFY pgrst, 'reload schema';
```

The final schema check in `tmp/clinical-roundtrip-after-migration.json` reports every clinical field, including `other_facility_name`, as present.

Evidence tags: DB PROOF.

## Code Changes

- Added `lib/db/clinicalFields.ts` for canonical clinical field definitions and aliases.
- Added `lib/db/patientUpdateFields.ts` for shared key-to-column mapping, collision reporting, and value normalization.
- Reworked `app/api/patient-sync/route.ts` to use the shared mapper, reject no-op mapped updates, log dev-only unmapped clinical keys, update by resolved identifier, and return a DB reread.
- Updated `components/PatientDetailDrawer.tsx` to use the shared clinical form-to-column map for save and realtime refresh.
- Updated `prisma/schema.prisma` with `other_facility_name` and `treatment_regimen`.
- Added `scripts/diagnose-clinical-pipeline.ts` and `scripts/clinical-field-roundtrip.ts`.

Evidence tags: CODE PROOF.

## Diagnostics

Run these from the repo root:

```powershell
bun run typecheck
bun run scripts/diagnose-clinical-pipeline.ts --mode=current
node_modules\.bin\next.cmd dev --port 3000
bun run scripts/clinical-field-roundtrip.ts --tag=after-migration --variant=all
```

Evidence files:

- `tmp/clinical-pipeline-diagnostics-legacy.json`
- `tmp/clinical-pipeline-diagnostics-current.json`
- `tmp/clinical-roundtrip-before2.json`
- `tmp/clinical-roundtrip-after-migration.json`

## Before/After Matrix

| Variant | Before | After final |
|---|---:|---:|
| Canonical snake_case | 14/14 persisted | 15/15 persisted |
| React-hook-form labels | 14/14 persisted | 15/15 persisted |
| Legacy flat keys | 1/14 persisted | 15/15 persisted |
| Intentional clears | 0/9 persisted | 10/10 persisted |
| Schema-covered fields | 14/15 present | 15/15 present |

Evidence tags: DB PROOF, REREAD PROOF.

## Hypothesis Results

1. Broken fields dropped by sanitizer: disproved. The sanitizer did not drop them.
2. Broken fields missing from mapping: proved for legacy flat keys.
3. Broken fields arrived as legacy flat keys while API expected snake_case/form labels: proved.
4. Broken clears skipped because value was `''`: proved.
5. Fields mapped to the wrong DB column: not observed in roundtrip; changed column matched intended field.
6. API update succeeded but updated zero meaningful fields: proved for old unmapped legacy payloads.
7. DB reread showed unchanged values despite successful-looking response: proved before fix.
8. Local optimistic state could mask DB non-persistence: possible; client now uses DB reread response for local state/SWR.
9. Wrong-row/no-op patient ID resolution: not observed; roundtrip used `kobo_uuid` and reread the same patient.

Evidence tags: CODE PROOF, MAPPING PROOF, DB PROOF, REREAD PROOF.

## Remaining Risks

- `PatientDetailDrawer` saves all clinical form keys currently present in react-hook-form. That is intentional for key-presence semantics and clears, but stale form hydration could still overwrite fields. The safest future refinement is to send dirty fields plus explicit clear actions once the UI has a clear dirty/clear contract.
- The worktree has unrelated modified/untracked files outside this clinical persistence fix. Review them separately before committing.

