import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wwcgybgvfulotflitogu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M'
);

const checks = [
  // Tables exist
  { label: 'ai_reconciliation_tasks table', fn: () => supabase.from('ai_reconciliation_tasks').select('id').limit(1) },
  { label: 'gemini_key_usage table',        fn: () => supabase.from('gemini_key_usage').select('key_index').limit(1) },

  // gemini_key_usage seeded with 11 rows
  { label: 'gemini_key_usage has 11 rows',  fn: async () => {
    const { count, error } = await supabase.from('gemini_key_usage').select('*', { count: 'exact', head: true });
    if (error) return { error };
    if (count !== 11) return { error: { message: `Expected 11 rows, got ${count}` } };
    return { data: count };
  }},

  // patients.ai_link_status column exists
  { label: 'patients.ai_link_status column', fn: async () => {
    const { data, error } = await supabase.from('patients').select('ai_link_status').limit(1);
    return { data, error };
  }},

  // RPC increment_gemini_key_usage exists
  { label: 'increment_gemini_key_usage RPC', fn: () =>
    supabase.rpc('increment_gemini_key_usage', { p_key_index: 1 })
  },
];

let passed = 0, failed = 0;
for (const { label, fn } of checks) {
  const { error } = await fn();
  if (error) {
    console.error(`❌ ${label}: ${error.message}`);
    failed++;
  } else {
    console.log(`✅ ${label}`);
    passed++;
  }
}

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
