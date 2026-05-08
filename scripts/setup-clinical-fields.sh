#!/bin/bash

# Script: Setup Clinical Fields for TB-PWA
# Purpose: Add missing clinical track fields to Supabase database
# Usage: ./setup-clinical-fields.sh

echo "🏥 TB-PWA Clinical Fields Setup"
echo "================================"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "supabase/config.tom" ]; then
    echo "❌ Not in TB-PWA project root. Please run from project directory."
    exit 1
fi

echo "✅ Environment validated"

# Run the migration
echo "📊 Adding clinical track fields to patients table..."
supabase db push --db-url $SUPABASE_DB_URL

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully"
else
    echo "❌ Migration failed"
    exit 1
fi

# Verify the fields were added
echo "🔍 Verifying clinical track fields..."
supabase db shell --command "
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'patients' 
AND column_name IN (
    'referral_date', 'referred_facility', 'tb_diagnosed', 'tb_diagnosis_date', 
    'tb_type', 'att_start_date', 'att_completion_date', 'hiv_status', 
    'art_status', 'art_number', 'nikshay_abha_id', 'registration_date', 'remarks'
)
ORDER BY column_name;
"

if [ $? -eq 0 ]; then
    echo "✅ Clinical track fields verified"
else
    echo "❌ Field verification failed"
    exit 1
fi

# Test the API with a sample update
echo "🧪 Testing clinical track data persistence..."
curl -X POST "http://localhost:3000/api/patient-sync" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "test-patient-id",
    "updates": {
      "referral_date": "07/05/26",
      "referred_facility": "Test Facility",
      "tb_diagnosed": "Y",
      "tb_diagnosis_date": "07/05/26",
      "hiv_status": "Negative"
    }
  }' | jq '.'

echo ""
echo "🎉 Clinical fields setup complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Test the clinical workflow in the UI"
echo "2. Verify step indicators turn green after data submission"
echo "3. Confirm data persists when reopening patient drawers"
echo ""
echo "🔧 If issues persist, check:"
echo "- Supabase connection: echo $SUPABASE_DB_URL"
echo "- API logs: Check server console for detailed error messages"
