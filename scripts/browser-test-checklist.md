# Browser Test Checklist for Demographics Sync

## Instructions
1. Open http://localhost:3000 in your browser
2. Login with your credentials
3. Navigate to any patient (e.g., patient ID: fdf26115-5782-4afc-aba4-2ac44585508f)
4. Click "Unlock to Edit"
5. Test each field group below by entering the test values
6. Click "Save Changes" after each group
7. Verify the values persist after save and page refresh

## Test Results

### ✅ Group 1: Identity & Contact
| Field | Test Value | Expected | Status | Notes |
|-------|------------|----------|---------|-------|
| Father / Husband | Test Father Browser | Test Father Browser | ☐ | |
| Date of Birth | 1985-06-15 | 1985-06-15 | ☐ | |
| Age | 38 | 38 | ☐ | |
| Sex | Female | Female | ☐ | |
| Inmate Type | Convicted | Convicted | ☐ | |
| Contact | 8888888888 | 8888888888 | ☐ | |
| Full Address | Test Address Browser | Test Address Browser | ☐ | |
| Inmate Name | Test Inmate Browser | Test Inmate Browser | ☐ | |

### ✅ Group 2: Screening Encounter
| Field | Test Value | Expected | Status | Notes |
|-------|------------|----------|---------|-------|
| Screening Date | 2026-05-06 | 2026-05-06 | ☐ | |
| Facility Name | Test Facility Browser | Test Facility Browser | ☐ | |
| Facility Type | District Jail | District Jail | ☐ | |
| Screening State | Maharashtra | Maharashtra | ☐ | |
| Screening District | Mumbai | Mumbai | ☐ | |
| Staff Name | Test Staff Browser | Test Staff Browser | ☐ | |
| Submitted On | 2026-05-06 | 2026-05-06 | ☐ | |

### ✅ Group 3: Diagnostics & Treatment
| Field | Test Value | Expected | Status | Notes |
|-------|------------|----------|---------|-------|
| X-Ray Result | Suspected TB Case | Suspected TB Case | ☐ | |
| TB Past History | Yes | Yes | ☐ | |
| TB Diagnosed | Inconclusive | Inconclusive | ☐ | |
| Diagnosis Date | 2026-05-06 | 2026-05-06 | ☐ | |
| ATT Start Date | 2026-05-06 | 2026-05-06 | ☐ | |
| Referral Date | 2026-05-06 | 2026-05-06 | ☐ | |
| Referred To | CBNAAT | CBNAAT | ☐ | |
| Treatment Regimen | 2HRZE/4HR | 2HRZE/4HR | ☐ | |

### ✅ Group 4: HIV / ART Status
| Field | Test Value | Expected | Status | Notes |
|-------|------------|----------|---------|-------|
| HIV Status | Positive | Positive | ☐ | |
| ART Started | Yes | Yes | ☐ | |
| ART Center | Test ART Center Browser | Test ART Center Browser | ☐ | |
| CPT Given | Yes (toggle) | Yes | ☐ | Checkbox |

### ✅ Group 5: Registration & System
| Field | Test Value | Expected | Status | Notes |
|-------|------------|----------|---------|-------|
| Unique ID | BROWSER-TEST-456 | BROWSER-TEST-456 | ☐ | |
| Nikshay ID | NIK-BROWSER-789 | NIK-BROWSER-789 | ☐ | |
| ABHA ID | ABHA-BROWSER-012 | ABHA-BROWSER-012 | ☐ | |

### ✅ Group 6: Conditional "Other" Fields
| Field | Test Value | Trigger Condition | Status | Notes |
|-------|------------|-------------------|---------|-------|
| Inmate Type Other | Custom Inmate Type | Set Inmate Type = "Other" | ☐ | |
| Screening State Other | Custom State | Set Screening State = "Other" | ☐ | |
| Screening District Other | Custom District | Set Screening District = "Other" | ☐ | |
| Referred To Facility Other | Custom Facility | Set Referred To = "Other" | ☐ | |

## Console Logs to Check
While testing, keep the browser console open (F12) and look for:
- `[DemographicsCarousel]` logs - show field changes
- `[PatientDetailDrawer]` logs - show save process
- `PAYLOAD` logs - show what's sent to API
- `RESPONSE` logs - show API response

## Expected Behavior
1. When you edit a field, you should see console logs showing the change
2. When you click "Save Changes", you should see the payload being sent
3. The API response should show `success: true`
4. The saved values should persist after page refresh
5. No errors should appear in console

## Troubleshooting
- If a field doesn't save, check console for errors
- If you see "UNAUTHORIZED", you may need to re-login
- If values don't persist after refresh, check if the field is in the payload
- If you see warnings about unmapped fields, the mapping may be incomplete

## Final Verification
After testing all fields:
- Total fields tested: 35+
- All fields should persist correctly
- No console errors
- All "Other" conditional fields should appear when triggered

## Test Completion
Once all fields are verified working:
- [ ] All Identity & Contact fields (8) ☐
- [ ] All Screening Encounter fields (7) ☐
- [ ] All Diagnostics & Treatment fields (8) ☐
- [ ] All HIV / ART Status fields (4) ☐
- [ ] All Registration & System fields (3) ☐
- [ ] All conditional "Other" fields (4) ☐

**Total: 34 fields to verify**
