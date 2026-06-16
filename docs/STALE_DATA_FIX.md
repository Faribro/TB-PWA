# STALE CLINICAL DATA BUG - ROOT CAUSE & FIX

## Investigation Summary

### What We Found

1. ✅ **`other_facility_name` column DOES NOT EXIST** in the patients table
   - The drawer tries to read/write this field, but it doesn't exist in Supabase
   - This is a UI-only field that should be removed

2. ✅ **Parent state update bug in CommandCenter.updatePatient()**
   - Line 204: `setSelectedPatient({ ...selectedPatient, ...updates })`
   - This only merges the `updates` object, NOT the full server response
   - The API returns `{ success: true, patient: updatedPatient }`
   - But the code ignores `updatedPatient` and only merges `updates`

3. ✅ **Drawer state preservation logic**
   - Lines 130-180 have complex logic that preserves stale `localPatient`
   - This prevents fresh data from reaching the form after save

4. ✅ **Missing fields from BULK_COLUMNS** (NOT the root cause)
   - `symptoms_present`, `chest_x_ray_result`, `date_corrected`, etc.
   - These are NOT clinical fields the drawer uses
   - Not causing the stale data bug

## The Real Bug

When a user:
1. Opens drawer → gets patient from list (via BULK_COLUMNS)
2. Fills clinical data → saves
3. API returns full `updatedPatient` object
4. **BUG**: CommandCenter only merges `updates`, ignores `updatedPatient`
5. Closes drawer
6. Reopens drawer → gets stale `selectedPatient` with old `updated_at` timestamp
7. Drawer's preservation logic sees stale timestamp, preserves old local state
8. Clinical data appears missing

## The Fix

### Change 1: Fix CommandCenter.updatePatient to use server response

**File**: `components/CommandCenter.tsx`
**Line**: 188-206

```typescript
// BEFORE (WRONG):
if (response.ok) {
  mutate((key: any) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
  if (selectedPatient?.id === id) setSelectedPatient({ ...selectedPatient, ...updates });
}

// AFTER (CORRECT):
if (response.ok) {
  const responseData = await response.json();
  
  // Update selectedPatient with full server-confirmed patient object
  if (responseData.patient && selectedPatient?.id === id) {
    setSelectedPatient(responseData.patient);
  }
  
  // Refresh SWR cache
  mutate((key: any) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
}
```

### Change 2: Simplify drawer state sync

**File**: `components/PatientDetailDrawer.tsx`
**Line**: 127-180

```typescript
// BEFORE: 50+ lines of complex preservation logic

// AFTER: Simple direct update
useEffect(() => {
  if (patient && Object.keys(patient).length > 0) {
    setLocalPatient(patient);
  }
}, [patient]);
```

### Change 3: Remove non-existent other_facility_name field

**File**: `components/PatientDetailDrawer.tsx`

Remove all references to `other_facility_name`:
- Line 239: Remove from form defaultValues
- Line 274: Remove from form reset
- Line 517: Remove from clinicalFieldMap
- Line 1212-1217: Remove conditional "Other Facility Name" input

The "Other" option should just store the custom value directly in `referred_facility`.

### Change 4: Add key prop to force clean remount

**File**: `components/CommandCenter.tsx`
**Line**: 724-730

```typescript
<PatientDetailDrawer
  key={selectedPatient.id || selectedPatient.kobo_uuid}
  patient={selectedPatient}
  isOpen={!!selectedPatient}
  onClose={() => setSelectedPatient(null)}
  onUpdate={() => mutate((key: any) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients')))}
/>
```

## Why This Fixes The Bug

1. **Fresh server data**: `selectedPatient` now contains the full server-confirmed patient with correct `updated_at` timestamp
2. **No stale preservation**: Drawer accepts fresh `patient` prop without complex logic
3. **Clean remount**: Key prop ensures drawer starts fresh when patient changes
4. **No phantom fields**: Removed `other_facility_name` that doesn't exist in database

## Testing Checklist

- [ ] Open drawer, fill clinical data, save
- [ ] Close drawer
- [ ] Reopen drawer
- [ ] Verify clinical data is still there
- [ ] Verify `updated_at` timestamp is current
- [ ] Verify no console errors about `other_facility_name`
- [ ] Test with "Other" facility option (should work without separate field)
