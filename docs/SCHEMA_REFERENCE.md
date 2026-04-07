# Patients Table Schema Reference - Register Reconciliation

## ✅ DEFINITIVE SCHEMA (2025-01-XX)

This document provides the **exact** column mappings for the `patients` table based on actual migrations in `supabase/migrations/`.

---

## 📊 Core Identity Columns (OCR → Database)

| OCR Field | Database Column | Type | Nullable | Source Migration | Notes |
|-----------|----------------|------|----------|------------------|-------|
| `name` | `inmate_name` | TEXT | Yes | Base schema | Primary patient name |
| `father_name` | `father_husband_name` | TEXT | Yes | Base schema | Father/husband name |
| `age` | `age` | **INTEGER** | Yes | `001_schema_hardening.sql` | ⚠️ Changed from TEXT to INTEGER |
| `mobile` | `contact_number` | TEXT | Yes | `002_kobo_etl_fields.sql` | 10-digit mobile number |
| `ward` | `facility_name` | TEXT | Yes | Base schema | Prison facility name |
| `address` | `address` | TEXT | Yes | `002_kobo_etl_fields.sql` | Full address |

---

## 🔐 Audit Trail Columns (Auto-Generated)

| Column | Type | Source | Default Value |
|--------|------|--------|---------------|
| `staff_name` | TEXT | Session | `session.user.name \|\| session.user.email` |
| `screening_date` | DATE | System | `new Date().toISOString().split("T")[0]` |
| `submitted_on` | TIMESTAMPTZ | System | `new Date().toISOString()` |
| `screening_state` | TEXT | Session | `session.user.state` |
| `screening_district` | TEXT | Session | `session.user.district` |

---

## 🎯 Phonetic Columns (Trigger-Populated)

| Column | Type | Populated By | Purpose |
|--------|------|--------------|---------|
| `name_romanized` | TEXT | `trg_patient_metaphone` | Copy of `inmate_name` |
| `name_metaphone_primary` | TEXT | `trg_patient_metaphone` | Primary phonetic key (Double Metaphone) |
| `name_metaphone_alternate` | TEXT | `trg_patient_metaphone` | Alternate phonetic key |

**⚠️ CRITICAL:** Never manually insert into these columns. The trigger fires on `BEFORE INSERT OR UPDATE OF inmate_name`.

---

## 🔧 TypeScript Insertion Payload

### ✅ Correct Implementation

```typescript
const newPatient: Record<string, any> = {
  // ── Core Identity Fields (from OCR) ──
  inmate_name: decision.extractedData.name || null,
  father_husband_name: decision.extractedData.father_name || null,
  
  // ⚠️ CRITICAL: age is INTEGER (not TEXT) per 001_schema_hardening.sql
  age: decision.extractedData.age != null
    ? Number(decision.extractedData.age)  // Cast to INTEGER
    : null,
  
  contact_number: decision.extractedData.mobile || null,
  address: decision.extractedData.address || null,
  
  // ── Facility Context ──
  facility_name: decision.extractedData.ward || null,
  
  // ── Audit Trail (required for tracking) ──
  staff_name: session.user.name || session.user.email || 'System',
  screening_date: new Date().toISOString().split("T")[0],  // DATE type
  submitted_on: new Date().toISOString(),  // TIMESTAMPTZ type
  
  // ── Ownership Context (for RLS policies) ──
  screening_state: session.user.state || null,
  screening_district: session.user.district || null,
  
  // ── Phonetic Columns (AUTO-POPULATED by trg_patient_metaphone) ──
  // DO NOT include: name_romanized, name_metaphone_primary, name_metaphone_alternate
};

// Remove undefined values
Object.keys(newPatient).forEach(key => {
  if (newPatient[key] === undefined) {
    delete newPatient[key];
  }
});

// Insert with return
const { data: insertedPatient, error } = await supabase
  .from("patients")
  .insert(newPatient)
  .select('id, inmate_name, name_romanized, name_metaphone_primary')
  .single();
```

### ❌ Common Mistakes

```typescript
// ❌ WRONG: Age as String (will fail with type error)
age: String(decision.extractedData.age)

// ❌ WRONG: Manually populating phonetic columns
name_romanized: decision.extractedData.name,
name_metaphone_primary: computeMetaphone(name),

// ❌ WRONG: Missing required audit fields
// (staff_name, screening_date, submitted_on should always be included)
```

---

## 📝 Migration History

### `001_schema_hardening.sql`
```sql
ALTER TABLE patients 
  ALTER COLUMN age TYPE INTEGER USING age::INTEGER,
  ALTER COLUMN screening_date TYPE DATE USING screening_date::DATE;
```
**Impact:** Age changed from TEXT to INTEGER

### `002_kobo_etl_fields.sql`
```sql
ALTER TABLE patients 
  ADD COLUMN IF NOT EXISTS contact_number TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;
```
**Impact:** Added contact_number and address columns

### `001_register_reconciliation.sql`
```sql
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS name_metaphone_primary   TEXT,
  ADD COLUMN IF NOT EXISTS name_metaphone_alternate TEXT,
  ADD COLUMN IF NOT EXISTS name_romanized            TEXT;

CREATE TRIGGER trg_patient_metaphone
  BEFORE INSERT OR UPDATE OF inmate_name ON patients
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_metaphone();
```
**Impact:** Added phonetic columns with auto-population trigger

---

## 🧪 Testing

### Test Case 1: Valid Insert
```typescript
const testData = {
  name: "Rajesh Kumar",
  father_name: "Ramesh Kumar",
  age: 35,  // Number
  mobile: "9876543210",
  ward: "Central Jail Ward A",
  address: "123 Main St, Delhi"
};
```

**Expected Database Record:**
```sql
SELECT 
  id,
  inmate_name,
  age,
  contact_number,
  name_romanized,
  name_metaphone_primary
FROM patients
WHERE inmate_name = 'Rajesh Kumar'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Output:**
| id | inmate_name | age | contact_number | name_romanized | name_metaphone_primary |
|----|-------------|-----|----------------|----------------|------------------------|
| uuid | Rajesh Kumar | 35 | 9876543210 | Rajesh Kumar | RJX |

### Test Case 2: Age Type Validation
```typescript
// ✅ Valid
age: 35  // Number
age: Number("35")  // Number from string

// ❌ Invalid (will cause PostgreSQL error)
age: "35"  // String
age: String(35)  // String
```

**PostgreSQL Error:**
```
column "age" is of type integer but expression is of type text
Hint: You will need to rewrite or cast the expression.
```

---

## 🔍 Debugging

### Verify Trigger Execution
```sql
-- Check if trigger exists
SELECT 
  tgname, 
  tgenabled,
  tgtype
FROM pg_trigger 
WHERE tgname = 'trg_patient_metaphone';

-- Test trigger manually
INSERT INTO patients (inmate_name, age, staff_name, screening_date)
VALUES ('Test Name', 25, 'Test Staff', CURRENT_DATE)
RETURNING id, inmate_name, name_romanized, name_metaphone_primary;
```

### Check Column Types
```sql
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'patients'
  AND column_name IN (
    'inmate_name',
    'age',
    'contact_number',
    'facility_name',
    'name_romanized',
    'name_metaphone_primary'
  )
ORDER BY ordinal_position;
```

---

## 📚 Related Files

- **API Route:** `app/api/register-reconcile/route.ts`
- **Migrations:**
  - `supabase/migrations/001_schema_hardening.sql`
  - `supabase/migrations/002_kobo_etl_fields.sql`
  - `supabase/migrations/001_register_reconciliation.sql`
- **Matcher:** `lib/matching/patientMatcher.ts`
- **Store:** `stores/useReconciliationStore.ts`

---

## ⚠️ Breaking Changes

### Version 1.0 → 2.0 (2025-01-XX)

**Changed:**
- `age` column type: `TEXT` → `INTEGER`
- Insertion code must use `Number()` instead of `String()`

**Migration Path:**
```typescript
// Old (v1.0)
age: String(decision.extractedData.age)

// New (v2.0)
age: Number(decision.extractedData.age)
```

**Rollback (if needed):**
```sql
ALTER TABLE patients 
  ALTER COLUMN age TYPE TEXT USING age::TEXT;
```

---

**Last Updated:** 2025-01-XX  
**Schema Version:** 2.0  
**Migration Status:** Applied  
**Trigger Status:** Active
