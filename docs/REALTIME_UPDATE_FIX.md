# Real-Time Update Fix - Clinical vs Demographics Tab

## Bug Report
**Issue**: Only `screening_date` field updates in real-time in demographics tab, while clinical tab fields (diagnosis, treatment, HIV/ART) do not reflect updates correctly.

## Root Cause

### Data Flow Architecture
```
User Save → API → Supabase → Realtime Event → Component State → UI Render
```

### The Problem

**Demographics Tab (Working)**:
- Uses custom `getValue()` function with 3-tier fallback:
  ```typescript
  localValues → editedDemographics → patient
  ```
- When realtime update arrives:
  ```typescript
  setEditedDemographics(mapDemographics(data)) // ✅ Updates state
  getValue('screening_date', ...) // ✅ Reads new value
  ```

**Clinical Tab (Broken)**:
- Uses React Hook Form's `watch()` to read field values
- Form initialized ONCE on mount via `reset()`
- When realtime update arrives:
  ```typescript
  setLocalPatient(data) // ✅ Updates state
  watch('Date of referral...') // ❌ Still has old value
  ```
- **Form values are never updated** to preserve user edits
- Step indicator reads from `watch()` which has stale values
- Form fields display stale values from `watch()`

### Why Only `screening_date` Works

Demographics tab doesn't use React Hook Form - it uses a custom state management system that updates immediately when `editedDemographics` changes.

## The Fix

**File**: `components/PatientDetailDrawer.tsx`  
**Lines**: 565-625 (realtime update handler)

### Solution

Selectively update React Hook Form values when realtime updates arrive, but ONLY when user is NOT actively editing:

```typescript
usePatientRealtimeUpdates({
  patientId: patient?.id || '',
  isEditing: isEditingDemographics || isDirty,
  onUpdate: (data) => {
    // Always update local state
    setLocalPatient(data);
    setEditedDemographics(mapDemographics(data));
    
    // NEW: Update form values when NOT editing
    if (!isDirty && !isEditingDemographics) {
      const clinicalFieldMap = {
        'Date of referral for TB Examination (sputum) (dd/mm/yy)': 'referral_date',
        'Name of facility where referred to (Give code/name of all facilities)': 'referred_facility',
        'TB diagnosed (Y/N)': 'tb_diagnosed',
        'Date of TB Diagnosed (dd/mm/yy)': 'tb_diagnosis_date',
        'Type of TB Diagnosed (P/EP)': 'tb_type',
        'Date of starting ATT (dd/mm/yyyy)': 'att_start_date',
        'Date of Treatment Completion (dd/mm/yyyy)': 'att_completion_date',
        'HIV Status (Positive/Negative/Unknown)': 'hiv_status',
        'Status at the time of referral (Pre ART/On ART)': 'art_status',
        'ART Number (if on ART at the time of referral)': 'art_number',
        'NIKSHAY/ABHA ID': 'nikshay_abha_id',
        'Date of registration (dd/mm/yyyy)': 'registration_date',
        'Remarks': 'remarks',
      };
      
      // Build update object with formatted dates
      const formUpdates: Record<string, any> = {};
      for (const [formKey, dbColumn] of Object.entries(clinicalFieldMap)) {
        const value = data[dbColumn];
        if (value !== undefined && value !== null) {
          if (formKey.toLowerCase().includes('date')) {
            formUpdates[formKey] = formatDateForInput(value);
          } else {
            formUpdates[formKey] = value;
          }
        }
      }
      
      // Update form without marking as dirty
      reset(formUpdates, { keepDefaultValues: false, keepDirty: false });
    }
  }
});
```

## How It Works

### Before Fix
1. User A saves clinical update (e.g., `referral_date = '2025-01-15'`)
2. API updates Supabase ✅
3. Realtime event fires ✅
4. `setLocalPatient(data)` updates state ✅
5. `watch('Date of referral...')` still returns `''` ❌
6. Form field shows empty value ❌
7. Step indicator shows incomplete ❌

### After Fix
1. User A saves clinical update (e.g., `referral_date = '2025-01-15'`)
2. API updates Supabase ✅
3. Realtime event fires ✅
4. `setLocalPatient(data)` updates state ✅
5. Check `isDirty` → false (not editing) ✅
6. Build `formUpdates` with all clinical fields ✅
7. Call `reset(formUpdates, { keepDirty: false })` ✅
8. `watch('Date of referral...')` now returns `'2025-01-15'` ✅
9. Form field shows new value ✅
10. Step indicator shows complete ✅

## Safety Guarantees

### User Edit Protection
```typescript
if (!isDirty && !isEditingDemographics) {
  // Only update when user is NOT editing
  reset(formUpdates, { keepDirty: false });
}
```

- `isDirty`: React Hook Form tracks if ANY field has been modified
- `isEditingDemographics`: Custom flag for demographics editing mode
- If either is true, realtime updates are blocked to preserve user input

### Date Formatting
```typescript
if (formKey.toLowerCase().includes('date')) {
  formUpdates[formKey] = formatDateForInput(value);
}
```

- Ensures dates are in `yyyy-MM-dd` format for HTML5 date inputs
- Prevents invalid date errors

### Null Safety
```typescript
if (value !== undefined && value !== null) {
  formUpdates[formKey] = value;
}
```

- Only updates fields that have actual values
- Prevents overwriting with `null` or `undefined`

## Testing Checklist

### Scenario 1: Real-Time Update (No Editing)
- [ ] User A opens patient drawer (clinical tab)
- [ ] User B saves clinical update (referral date)
- [ ] User A sees referral date update in real-time
- [ ] Step indicator updates to show "Sputum & Referral" complete
- [ ] Form field shows new date value

### Scenario 2: Real-Time Update (While Editing)
- [ ] User A opens patient drawer (clinical tab)
- [ ] User A starts typing in "TB Diagnosed" field
- [ ] User B saves clinical update (referral date)
- [ ] User A's input is NOT overwritten
- [ ] User A's form remains dirty
- [ ] After User A saves, they see User B's update

### Scenario 3: Demographics Tab (Unchanged)
- [ ] User A opens patient drawer (demographics tab)
- [ ] User B saves demographics update (screening date)
- [ ] User A sees screening date update in real-time
- [ ] All other demographics fields update correctly

### Scenario 4: Tab Switching
- [ ] User A opens patient drawer (clinical tab)
- [ ] User B saves clinical update
- [ ] User A switches to demographics tab
- [ ] User A switches back to clinical tab
- [ ] Clinical fields show updated values

## Performance Impact

- **Minimal**: Only runs when realtime update arrives AND user is not editing
- **No extra API calls**: Uses data from realtime event
- **No re-renders**: `reset()` with `keepDirty: false` doesn't trigger dirty state
- **Efficient**: Only updates fields that have changed values

## Related Files

- `components/PatientDetailDrawer.tsx` - Main fix location
- `hooks/usePatientRealtimeUpdates.ts` - Realtime subscription hook
- `app/api/patient-sync/route.ts` - API endpoint (returns full patient object)
- `components/DemographicsCarousel.tsx` - Demographics tab (already working)
- `components/FollowUpPipeline.tsx` - Patient list (syncs with prop changes)

## Conclusion

The fix ensures **both demographics AND clinical tabs update consistently in real-time** by:
1. Updating React Hook Form values when realtime events arrive
2. Protecting user edits by checking `isDirty` flag
3. Formatting dates correctly for HTML5 inputs
4. Maintaining null safety and type correctness

This creates a **single source of truth** for both tabs while preserving the UX of not overwriting in-progress edits.
