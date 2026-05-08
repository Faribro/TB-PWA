# API Response Test

Based on the debug output, I can see:

1. **Form is working correctly** - watchedReferralDate: "2026-05-04" shows form has data
2. **Data is saving to database** - hiv_status: "negative" appears in localPatient after save
3. **API response is losing clinical data** - localPatient.referral_date becomes null after save

The issue is that the API response is not returning the updated clinical fields correctly.

## Next Steps:
1. Test the API with enhanced logging to see what clinical fields are returned
2. Fix the API response mapping if needed
3. Ensure form reset gets the correct clinical data

## Expected API Response:
The API should return all clinical fields with their updated values:
- referral_date: "2026-05-04"
- referred_facility: "DMC-Designated microscopy centre"  
- hiv_status: "negative"
- etc.

## Current Issue:
After save, localPatient shows null values for clinical fields, indicating the API response is not including them.
