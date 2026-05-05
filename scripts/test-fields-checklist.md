# Editable Fields Test Checklist

## Instructions
1. Go to http://localhost:3000
2. Login and navigate to any patient
3. Click "Unlock to Edit"
4. For each field below, change the value and click "Save Changes"
5. Verify the change persists after save and refresh

## Test Results

### ✅ Screening Details
- [ ] Staff Name
- [ ] Submitted On (date)
- [ ] Screening State
- [ ] Screening District
- [ ] Facility Name
- [ ] Facility Type
- [x] Screening Date (✅ Working)
- [ ] Unique ID

### ✅ Identity & Contact
- [ ] Inmate Name
- [ ] Inmate Type
- [ ] Father / Husband Name
- [ ] Date of Birth (date)
- [ ] Age (number)
- [ ] Sex
- [ ] Contact Number
- [ ] Address

### ✅ TB Screening
- [ ] X-Ray Result
- [ ] TB Past History
- [ ] Symptoms 10s (symptom checklist)

## Notes
- All fields should use the same save mechanism as screening_date
- If a field doesn't save, check browser console for errors
- Look for logs like:
  - `Event detail (flushed changes):`
  - `Converting "field_name" -> "fieldname"`
  - `PAYLOAD field_name:`

## Expected Behavior
- Field changes should persist after save
- Date fields should accept yyyy-MM-dd format
- Number fields should accept numeric values
- Text fields should accept string values
- Select fields should show dropdown options
