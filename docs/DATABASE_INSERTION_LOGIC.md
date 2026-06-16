# Register Reconciliation Database Insertion Logic

## Overview

This document explains the **schema-compliant** database insertion logic for the Register Reconciliation system, specifically how new patients are created when M&E officers click "Create New & Notify" in the Bento Triage Dashboard.

---

## 🔒 Critical Directives

### 1. **DO NOT Manually Populate Phonetic Columns**

The following columns are **automatically populated** by the `trg_patient_metaphone` trigger:
- `name_romanized`
- `name_metaphone_primary`
- `name_metaphone_alternate`

**Never** insert values into these columns manually. The trigger fires on `BEFORE INSERT OR UPDATE OF inmate_name` and computes:
```sql
NEW.name_romanized         := COALESCE(NEW.inmate_name, '');
NEW.name_metaphone_primary := dmetaphone(COALESCE(NEW.inmate_name, ''));
NEW.name_metaphone_alternate := dmetaphone_alt(COALESCE(NEW.inmate_name, ''));
```

### 2. **Age is TEXT, Not INTEGER**

The `patients.age` column is defined as `TEXT` in the schema. Always convert extracted age to string:
```typescript
age: decision.extractedData.age != null
  ? String(decision.extractedData.age)  // ✅ Correct
  : null,

// ❌ WRONG:
age: decision.extractedData.age,  // Type mismatch if age is number
```

### 3. **Schema Validation**

The insertion logic includes enhanced error logging to catch schema mismatches:
```typescript
if (error) {
  console.error(
    `[RegisterReconcile] Insert failed for row ${decision.sno}:`,
    {
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      payload: newPatient,
    }
  );
}
```

---

## 📊 Patients Table Schema

### Core Identity Columns
| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `inmate_name` | TEXT | OCR `name` | Primary name field |
| `father_husband_name` | TEXT | OCR `father_name` | Father's name |
| `age` | TEXT | OCR `age` | **TEXT type**, not INT |
| `contact_number` | TEXT | OCR `mobile` | 10-digit mobile |
| `address` | TEXT | OCR `address` | Full address |
| `facility_name` | TEXT | OCR `ward` | Prison facility |

### Phonetic Columns (Auto-Populated)
| Column | Type | Populated By | Purpose |
|--------|------|--------------|---------|
| `name_romanized` | TEXT | Trigger | Copy of `inmate_name` |
| `name_metaphone_primary` | TEXT | Trigger | Primary phonetic key |
| `name_metaphone_alternate` | TEXT | Trigger | Alternate phonetic key |
| `name_variants` | TEXT[] | Manual | Alternative spellings |

### Audit Trail Columns
| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `staff_name` | TEXT | Session | M&E officer name |
| `screening_date` | DATE | System | Current date (YYYY-MM-DD) |
| `submitted_on` | TIMESTAMPTZ | System | ISO timestamp |
| `screening_state` | TEXT | Session | User's state |
| `screening_district` | TEXT | Session | User's district |

---

## 🔧 Implementation

### File: `app/api/register-reconcile/route.ts`

#### Insert Logic (Lines 110-170)

```typescript
else if (decision.action === "create") {
  // ── Insert new patient ──
  // CRITICAL: Only insert into actual schema columns
  // DO NOT manually populate name_romanized, name_metaphone_primary, or name_metaphone_alternate
  // The trg_patient_metaphone trigger handles these automatically
  
  const newPatient: Record<string, any> = {
    // Core identity fields
    inmate_name: decision.extractedData.name || null,
    father_husband_name: decision.extractedData.father_name || null,
    age: decision.extractedData.age != null
      ? String(decision.extractedData.age)  // Schema expects TEXT, not INT
      : null,
    contact_number: decision.extractedData.mobile || null,
    address: decision.extractedData.address || null,
    
    // Facility context (if available from ward field)
    facility_name: decision.extractedData.ward || null,
    
    // Audit trail
    staff_name: session.user.name || session.user.email || 'System',
    screening_date: new Date().toISOString().split("T")[0],
    submitted_on: new Date().toISOString(),
    
    // Default values for required fields (adjust based on your schema)
    screening_state: session.user.state || null,
    screening_district: session.user.district || null,
    
    // Phonetic columns will be auto-populated by trg_patient_metaphone trigger
    // name_romanized: SKIP - trigger handles this
    // name_metaphone_primary: SKIP - trigger handles this
    // name_metaphone_alternate: SKIP - trigger handles this
  };

  // Remove null/undefined values to avoid schema violations
  Object.keys(newPatient).forEach(key => {
    if (newPatient[key] === undefined) {
      delete newPatient[key];
    }
  });

  const { data: insertedPatient, error } = await supabase
    .from("patients")
    .insert(newPatient)
    .select('id, inmate_name, name_romanized, name_metaphone_primary')
    .single();

  if (error) {
    // Enhanced error logging for schema mismatches
    console.error(
      `[RegisterReconcile] Insert failed for row ${decision.sno}:`,
      {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        payload: newPatient,
      }
    );
    
    results.errors.push({
      sno: decision.sno,
      error: `Insert failed: ${error.message}${error.hint ? ` (Hint: ${error.hint})` : ''}`,
    });
  } else {
    results.created++;
    
    // Verify trigger populated phonetic columns
    if (insertedPatient) {
      console.log(
        `[RegisterReconcile] ✅ Created patient ${insertedPatient.id}:`,
        {
          inmate_name: insertedPatient.inmate_name,
          name_romanized: insertedPatient.name_romanized,
          metaphone: insertedPatient.name_metaphone_primary,
        }
      );
    }
  }
}
```

---

## 📝 Extraction Audit Update

After processing all decisions, the `register_extractions` table is updated to mark the session as committed:

```typescript
// ── Update extraction record with review decisions ──
const { error: updateError } = await supabase
  .from("register_extractions")
  .update({
    status: "committed",           // pending → committed
    review_decisions: body.decisions,  // Store officer's decisions
    committed_at: new Date().toISOString(),
  })
  .eq("id", body.extractionId);

if (updateError) {
  console.error(
    "[RegisterReconcile] Failed to update extraction record:",
    updateError
  );
}
```

### Register Extractions Schema

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `created_at` | TIMESTAMPTZ | Extraction timestamp |
| `created_by` | TEXT | M&E officer email |
| `image_url` | TEXT | Supabase Storage path |
| `status` | TEXT | `pending` → `committed` |
| `extracted_rows` | JSONB | Raw OCR output |
| `match_results` | JSONB | Fuzzy match candidates |
| `review_decisions` | JSONB | Officer's accept/create/reject |
| `committed_at` | TIMESTAMPTZ | Commit timestamp |
| `metadata` | JSONB | Model version, latency |

---

## 🧪 Testing

### Test Case 1: Valid New Patient

**Input:**
```json
{
  "extractionId": "uuid-123",
  "decisions": [
    {
      "sno": 1,
      "action": "create",
      "extractedData": {
        "name": "Rajesh Kumar",
        "father_name": "Ramesh Kumar",
        "age": 35,
        "mobile": "9876543210",
        "ward": "Central Jail Ward A",
        "address": "123 Main St, Delhi"
      }
    }
  ]
}
```

**Expected Result:**
```json
{
  "success": true,
  "accepted": 0,
  "created": 1,
  "rejected": 0,
  "errors": [],
  "total": 1
}
```

**Database Verification:**
```sql
SELECT 
  id,
  inmate_name,
  name_romanized,
  name_metaphone_primary,
  age,
  contact_number
FROM patients
WHERE inmate_name = 'Rajesh Kumar'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Output:**
| id | inmate_name | name_romanized | name_metaphone_primary | age | contact_number |
|----|-------------|----------------|------------------------|-----|----------------|
| uuid | Rajesh Kumar | Rajesh Kumar | RJX | 35 | 9876543210 |

---

### Test Case 2: Schema Mismatch (Age as Number)

**Input:**
```json
{
  "extractedData": {
    "name": "Test Patient",
    "age": 25  // ❌ Number instead of string
  }
}
```

**Expected Behavior:**
- Conversion to string: `String(25)` → `"25"`
- Successful insert
- No schema violation

---

### Test Case 3: Missing Required Fields

**Input:**
```json
{
  "extractedData": {
    "name": null,  // Missing name
    "age": 30
  }
}
```

**Expected Behavior:**
- Insert with `inmate_name: null`
- Trigger sets `name_romanized: ''` (empty string)
- Trigger sets `name_metaphone_primary: dmetaphone('')`
- Successful insert (if schema allows null names)

---

## 🔍 Debugging

### Enable Detailed Logging

Set environment variable:
```bash
LOG_LEVEL=debug
```

### Check Trigger Execution

```sql
-- Verify trigger is active
SELECT 
  tgname, 
  tgtype, 
  tgenabled 
FROM pg_trigger 
WHERE tgname = 'trg_patient_metaphone';

-- Test trigger manually
INSERT INTO patients (inmate_name, age, staff_name, screening_date)
VALUES ('Test Name', '25', 'Test Staff', CURRENT_DATE)
RETURNING id, inmate_name, name_romanized, name_metaphone_primary;
```

### Common Errors

#### Error: `column "name_romanized" does not exist`
**Cause:** Migration not applied  
**Fix:** Run `supabase db push` or apply `001_register_reconciliation.sql`

#### Error: `invalid input syntax for type integer: "25"`
**Cause:** Age column type mismatch  
**Fix:** Verify `age` is `TEXT` type, not `INTEGER`

#### Error: `null value in column "inmate_name" violates not-null constraint`
**Cause:** Schema requires non-null name  
**Fix:** Add validation before insert or update schema to allow nulls

---

## 🚀 Deployment Checklist

- [ ] Run migration: `001_register_reconciliation.sql`
- [ ] Verify trigger exists: `trg_patient_metaphone`
- [ ] Verify extensions enabled: `fuzzystrmatch`, `pg_trgm`
- [ ] Test insert with sample data
- [ ] Verify phonetic columns auto-populate
- [ ] Check `register_extractions` table exists
- [ ] Test status update: `pending` → `committed`
- [ ] Enable error logging in production
- [ ] Set up Sentry alerts for schema violations

---

## 📚 Related Files

- **API Route:** `app/api/register-reconcile/route.ts`
- **Migration:** `supabase/migrations/001_register_reconciliation.sql`
- **Matcher:** `lib/matching/patientMatcher.ts`
- **Store:** `stores/useReconciliationStore.ts`
- **UI Component:** `components/reconciliation/BentoTriageCard.tsx`

---

## 🔮 Future Enhancements

1. **Batch Insert Optimization:** Use `insert().select()` for multiple rows
2. **Duplicate Detection:** Check for existing patients before insert
3. **Rollback Support:** Transaction-based insert with rollback on error
4. **Audit Trail:** Log all inserts to separate audit table
5. **Validation Layer:** Pre-insert validation for required fields
6. **Google Sheets Sync:** Trigger webhook after successful insert

---

**Last Updated:** 2025-01-XX  
**Schema Version:** 001_register_reconciliation  
**Trigger:** trg_patient_metaphone (BEFORE INSERT OR UPDATE)
