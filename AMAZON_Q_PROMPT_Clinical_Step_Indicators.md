# Amazon Q: Clinical Step Indicators Diagnosis & Testing

## Project Overview
TB-PWA (Tuberculosis Patient Management System) - Clinical workflow step indicators are not functioning correctly. When clinical data is submitted for any step (Sputum & Referral, Diagnosis, Treatment, HIV & ART Status, Nikshay & Registration), the step indicators should turn green immediately and remain green permanently. Clinical data should persist and be prefilled when reopening patient drawers.

## Current Issue Analysis

### Problem Statement
1. **Step Indicators Not Turning Green**: Clinical step indicators remain gray/unclicked after data submission
2. **Data Not Persisting**: Clinical form data is not being prefilled when reopening patient drawers  
3. **Database Storage Issue**: Clinical data may not be properly saved to Supabase database
4. **Google Sheets Sync Issue**: Clinical data may not be syncing to Google Sheets

### Technical Context
- **Frontend**: Next.js with React, TypeScript, TailwindCSS
- **Backend**: Next.js API routes, Supabase database
- **State Management**: SWR for data fetching, React Hook Form for forms
- **Real-time**: Supabase Realtime subscriptions
- **External Integration**: Google Sheets via Apps Script webhooks

### Current Implementation Status
- Step indicator logic updated to check both saved patient data and form values
- API response modified to use `select('*')` to return all fields
- Enhanced logging added to patient-sync API for debugging
- Clinical field mapping exists in API but fields data not persisting

## Required Investigation & Fixes

### 1. Database Schema Analysis
**Objective**: Verify clinical fields exist in Supabase patients table schema

**Tasks**:
- Examine Supabase patients table schema for clinical fields:
  - `referral_date`, `referred_facility`
  - `tb_diagnosed`, `tb_diagnosis_date`, `tb_type`
  - `att_start_date`, `att_completion_date`
  - `hiv_status`, `art_status`, `art_number`
  - `nikshay_abha_id`, `registration_date`
- If fields don't exist, create migration to add them
- If fields have different names, update field mapping

**Deliverable**: Database schema report with field existence confirmation

### 2. API Endpoint Diagnosis
**Objective**: Fix patient-sync API to properly save and return clinical data

**Current Issues**:
- API response only returns 4 basic fields instead of all clinical fields data
- Clinical updates may not be persisting to database despite "success" response

**Tasks**:
- Analyze patient-sync API (`/app/api/patient-sync/route.ts`)
- Verify field mapping in `FIELD_MAPPING` object
- Test database update operations for each clinical field
- Ensure API returns complete updated patient data
- Fix any field name mismatches between frontend and database

**Deliverable**: Working API that properly saves and returns clinical data

### 3. Frontend Step Indicator Logic
**Objective**: Fix step indicators to turn green based on actual saved data

**Current Implementation**: 
- Located in `components/PatientDetailDrawer.tsx` (lines 915-987)
- Uses `isComplete` flags with Boolean checks on form watched values and saved patient data

**Tasks**:
- Verify step indicator logic correctly checks saved patient data fields
- Ensure proper field mapping between form values and database fields
- Test each step indicator individually:
  - Sputum & Referral: `referral_date` AND `referred_facility`
  - Diagnosis: `tb_diagnosed` AND `tb_diagnosis_date`
  - Treatment: `att_start_date`
  - HIV & ART: `hiv_status`
  - Nikshay: `nikshay_abha_id`

**Deliverable**: Step indicators that turn green immediately after data submission

### 4. Data Persistence Testing
**Objective**: Ensure clinical data persists and prefills correctly

**Tasks**:
- Test form data persistence across patient drawer open/close cycles
- Verify SWR cache updates correctly after clinical data submission
- Test real-time updates with Supabase subscriptions
- Ensure form default values load saved patient data

**Deliverable**: Clinical forms that prefill with saved data on reopen

## Comprehensive Test Suite Requirements

### Test File Structure
Create test files for each clinical workflow component:

```
/tests/clinical-workflow/
├── sputum-referral.test.ts
├── diagnosis.test.ts
├── treatment.test.ts
├── hiv-art.test.ts
├── nikshay-registration.test.ts
└── integration.test.ts
```

### Test Cases per Component

#### 1. Sputum & Referral Tests (`sputum-referral.test.ts`)
```typescript
describe('Sputum & Referral Clinical Step', () => {
  test('should turn green when both referral_date and referred_facility are submitted');
  test('should remain green after closing and reopening patient drawer');
  test('should prefill saved referral data when reopening drawer');
  test('should persist data to Supabase database');
  test('should sync data to Google Sheets');
  test('should update SWR cache after submission');
  test('should trigger real-time updates across connected clients');
});
```

#### 2. Diagnosis Tests (`diagnosis.test.ts`)
```typescript
describe('Diagnosis Clinical Step', () => {
  test('should turn green when tb_diagnosed and tb_diagnosis_date are submitted');
  test('should handle tb_type field correctly');
  test('should remain green permanently after completion');
  test('should prefill saved diagnosis data on reopen');
  test('should validate TB diagnosis date format');
  test('should persist all diagnosis fields to database');
});
```

#### 3. Treatment Tests (`treatment.test.ts`)
```typescript
describe('Treatment Clinical Step', () => {
  test('should turn green when att_start_date is submitted');
  test('should handle att_completion_date field');
  test('should validate ATT start date format (dd/mm/yyyy)');
  test('should persist treatment data correctly');
  test('should prefill treatment data on reopen');
  test('should handle treatment completion updates');
});
```

#### 4. HIV & ART Status Tests (`hiv-art.test.ts`)
```typescript
describe('HIV & ART Status Clinical Step', () => {
  test('should turn green when hiv_status is submitted');
  test('should handle art_status and art_number fields');
  test('should validate HIV status values (Positive/Negative/Unknown)');
  test('should persist HIV/ART data to database');
  test('should prefill HIV/ART data on reopen');
  test('should handle ART number validation');
});
```

#### 5. Nikshay & Registration Tests (`nikshay-registration.test.ts`)
```typescript
describe('Nikshay & Registration Clinical Step', () => {
  test('should turn green when nikshay_abha_id is submitted');
  test('should handle registration_date field');
  test('should validate Nikshay/ABHA ID format');
  test('should persist registration data correctly');
  test('should prefill registration data on reopen');
  test('should handle registration date validation');
});
```

#### 6. Integration Tests (`integration.test.ts`)
```typescript
describe('Clinical Workflow Integration', () => {
  test('should complete all steps in sequence');
  test('should maintain step states across multiple submissions');
  test('should handle concurrent updates from multiple users');
  test('should sync all clinical data to Google Sheets');
  test('should handle network failures gracefully');
  test('should validate complete clinical workflow data integrity');
});
```

## Testing Framework Setup

### Required Dependencies
```json
{
  "jest": "^29.0.0",
  "@testing-library/react": "^13.0.0",
  "@testing-library/jest-dom": "^5.16.0",
  "@testing-library/user-event": "^14.0.0",
  "msw": "^1.0.0",
  "supabase-js": "^2.0.0"
}
```

### Mock Services
- **Supabase Mock**: Mock database operations for clinical field updates
- **Google Sheets Mock**: Mock Apps Script webhook calls
- **SWR Mock**: Mock data fetching and cache updates
- **Realtime Mock**: Mock Supabase realtime subscriptions

### Test Data
Create comprehensive test patient data with all clinical scenarios:
- Patients with partial clinical data
- Patients with complete clinical workflow
- Patients with invalid/malformed clinical data
- Edge cases (empty dates, invalid formats, etc.)

## Performance & Reliability Requirements

### Response Time Targets
- Clinical data submission: < 2 seconds
- Step indicator updates: < 500ms
- Data prefetch on drawer open: < 1 second
- Real-time updates: < 1 second

### Reliability Tests
- Network interruption handling
- Concurrent user updates
- Large dataset performance
- Memory leak prevention
- Error recovery mechanisms

## Security & Validation Requirements

### Data Validation
- Date format validation (dd/mm/yy, dd/mm/yyyy)
- Field value validation (Y/N for TB diagnosis, etc.)
- Input sanitization for all clinical fields data
- SQL injection prevention

### Access Control
- Verify clinical data access permissions
- Test state-based authorization for clinical updates
- Validate admin override functionality

## Deliverables

1. **Database Schema Fix**: Updated Supabase schema with all clinical fields data
2. **API Endpoint Fix**: Fully functional patient-sync API with clinical data persistence
3. **Frontend Logic Fix**: Working step indicators with proper data persistence
4. **Comprehensive Test Suite**: All test files with 95%+ coverage
5. **Integration Tests**: End-to-end clinical workflow validation
6. **Performance Report**: Response time and reliability metrics
7. **Documentation**: Updated API documentation and field mapping guide

## Success Criteria

### Functional Requirements
✅ All clinical step indicators turn green immediately after data submission
✅ Clinical data persists across patient drawer open/close cycles  
✅ Forms prefill with saved clinical data on reopen
✅ All clinical data saves to Supabase database
✅ Clinical data syncs to Google Sheets
✅ Real-time updates work across connected clients

### Technical Requirements
✅ 95%+ test coverage for clinical workflow components
✅ All integration tests pass
✅ Performance targets met (response times < 2 seconds)
✅ No memory leaks or performance regressions
✅ Proper error handling and recovery mechanisms

### Quality Requirements
✅ Clean, maintainable code following project standards
✅ Comprehensive documentation for all changes
✅ Security validation for all clinical data inputs
✅ Accessibility compliance for clinical workflow UI

## Timeline & Priority

**Phase 1 (High Priority - Immediate)**: Database schema analysis and API fixes
**Phase 2 (High Priority - Day 2)**: Frontend step indicator logic fixes
**Phase 3 (Medium Priority - Day 3)**: Comprehensive test suite development
**Phase 4 (Medium Priority - Day 4)**: Integration testing and performance optimization
**Phase 5 (Low Priority - Day 5)**: Documentation and deployment preparation

This comprehensive prompt provides Amazon Q with all necessary context, requirements, and success criteria to diagnose, fix, and thoroughly test the clinical step indicators functionality in the TB-PWA system.
