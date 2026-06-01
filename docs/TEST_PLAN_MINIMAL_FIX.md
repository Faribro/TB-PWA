# TEST PLAN: Minimal Fix for Stale Clinical Data Bug

## Changes Applied

### ✅ Fix 1: CommandCenter.updatePatient (components/CommandCenter.tsx)
- Changed from: `setSelectedPatient({ ...selectedPatient, ...updates })`
- Changed to: `setSelectedPatient(responseData.patient)`
- **Why**: Use full server-confirmed patient object instead of partial merge

### ✅ Fix 2: Add key prop (components/CommandCenter.tsx)
- Added: `key={selectedPatient.id || selectedPatient.kobo_uuid}`
- **Why**: Force clean remount when patient changes

### ❌ NOT Applied: Drawer state simplification
- **Reason**: Previous attempt caused "No Patient Data" bug in vertex tab
- **Strategy**: Let the drawer's existing preservation logic work with fresh parent data

## Theory

The drawer's preservation logic (lines 130-180) compares timestamps:
```typescript
if (localPatient?.updated_at && patient?.updated_at) {
  const localPatientUpdated = new Date(localPatient.updated_at) > new Date(patient.updated_at);
  if (localPatientUpdated) {
    return; // Preserve local
  }
}
```

**Before fix**: Parent had stale `updated_at`, so drawer preserved old local state
**After fix**: Parent has fresh `updated_at` from server, so drawer accepts new data

## Test Scenarios

### Scenario 1: Basic Save & Reopen
1. Open drawer for patient
2. Fill clinical data (e.g., HIV status = "Positive")
3. Click "Submit Clinical Update"
4. Wait for success toast
5. Close drawer
6. Reopen same patient
7. **Expected**: Clinical data is still there
8. **Check**: Console logs show fresh `updated_at` timestamp

### Scenario 2: Multiple Field Updates
1. Open drawer
2. Fill multiple fields:
   - Referral date
   - Referred facility
   - TB diagnosed
   - HIV status
3. Save
4. Close & reopen
5. **Expected**: All fields preserved

### Scenario 3: Vertex Tab (Regression Test)
1. Navigate to Vertex tab
2. **Expected**: Patient data loads normally
3. **Expected**: No "No Patient Data" message
4. **Expected**: All patients visible

### Scenario 4: Follow-up Pipeline (Regression Test)
1. Navigate to Follow-up Pipeline
2. **Expected**: Patient list loads
3. Click on a patient
4. **Expected**: Drawer opens with data

### Scenario 5: Timestamp Verification
1. Open drawer
2. Note the `updated_at` in console logs
3. Make a change and save
4. **Expected**: Console shows NEW `updated_at` timestamp
5. Close & reopen
6. **Expected**: Drawer receives patient with NEW timestamp
7. **Expected**: Drawer accepts new data (doesn't preserve stale local)

## Console Log Checkpoints

Look for these logs:
```
[PatientDetailDrawer] 🔄 Patient prop changed
[PatientDetailDrawer] 🔍 Clinical data comparison
[PatientDetailDrawer] ✅ Updating localPatient with patient prop
```

**Good sign**: "Updating localPatient with patient prop"
**Bad sign**: "Preserving localPatient - has timestamp, patient prop does not"

## Rollback Plan

If this breaks:
```bash
git restore components/CommandCenter.tsx
```

## Success Criteria

- ✅ Clinical data persists after save & reopen
- ✅ Vertex tab loads patients normally
- ✅ Follow-up pipeline works
- ✅ No console errors
- ✅ Timestamps are current after save
