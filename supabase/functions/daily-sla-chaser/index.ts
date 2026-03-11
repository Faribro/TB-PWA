import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all active patients
    const { data: patients, error } = await supabase
      .from('patients')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    const breachedPatients = patients.filter((patient: any) => {
      const submittedDate = patient.submitted_on || patient.screening_date;
      if (!submittedDate) return false;

      const daysSince = (Date.now() - new Date(submittedDate).getTime()) / (1000 * 60 * 60 * 24);
      const phase = (patient.current_phase || '').toLowerCase();
      
      return daysSince > 7 && !phase.includes('treatment') && !phase.includes('closed');
    });

    // Group by coordinator
    const breachByCoordinator = breachedPatients.reduce((acc: any, patient: any) => {
      const coordinator = patient.coordinator_name || 'Unassigned';
      if (!acc[coordinator]) {
        acc[coordinator] = [];
      }
      acc[coordinator].push({
        name: patient.inmate_name,
        id: patient.unique_id,
        facility: patient.facility_name,
        daysSince: Math.floor((Date.now() - new Date(patient.submitted_on || patient.screening_date).getTime()) / (1000 * 60 * 60 * 24))
      });
      return acc;
    }, {});

    // Generate summary report
    const summary = {
      totalBreached: breachedPatients.length,
      timestamp: new Date().toISOString(),
      byCoordinator: Object.entries(breachByCoordinator).map(([coordinator, patients]: [string, any]) => ({
        coordinator,
        count: patients.length,
        patients: patients.slice(0, 10) // Top 10 per coordinator
      }))
    };

    // Log to Supabase table (create sla_breach_logs table)
    await supabase.from('sla_breach_logs').insert({
      breach_count: summary.totalBreached,
      summary: summary,
      created_at: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: true,
        summary
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
