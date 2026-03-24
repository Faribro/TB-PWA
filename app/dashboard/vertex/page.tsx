'use client';

import { useEffect, useState } from 'react';
import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import dynamic from 'next/dynamic';
import { LinesAndDotsLoader } from '@/components/LinesAndDotsLoader';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const NeuralDashboard = dynamic(() => import('@/app/dashboard/neural-dashboard-view'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <LinesAndDotsLoader progress={75} />
    </div>
  ),
});

export default function VertexPage() {
  const { data: globalPatients = [], isLoading } = useSWRAllPatients();
  const [metrics, setMetrics] = useState({ total: 0, pending: 0, thisMonth: 0 });

  useEffect(() => {
    async function fetchMetrics() {
      // 1. Total Screened
      const { count: totalResponse } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      // 2. Pending Alerts
      const { count: pendingResponse } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('xray_result', 'ABNORMAL')
        .is('treatment_start_date', null)
        .is('att_start_date', null)
        .is('referral_date', null);

      // 3. This Month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count: thisMonthResponse } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .gte('submitted_on', startOfMonth.toISOString());

      setMetrics({
        total: totalResponse || 0,
        pending: pendingResponse || 0,
        thisMonth: thisMonthResponse || 0,
      });
    }
    fetchMetrics();
    
    // Auto-refresh metrics every 30s
    const id = setInterval(fetchMetrics, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <div className="flex-1 relative min-h-0">
        <NeuralDashboard
          globalPatients={globalPatients}
          isLoading={isLoading}
          filter={null}
          onSetFilter={() => {}}
        />
      </div>
      
      {/* Live Supabase Metrics Row */}
      <div className="h-[100px] shrink-0 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-50 flex items-center justify-center gap-12 px-8">
        <div className="flex flex-col items-center">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Screened</p>
          <p className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">
            {metrics.total.toLocaleString()}
          </p>
        </div>
        
        <div className="w-px h-12 bg-slate-200" />
        
        <div className="flex flex-col items-center">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-400 mb-1">Pending Alerts</p>
          <p className="text-4xl font-black text-rose-600 tracking-tighter tabular-nums leading-none">
            {metrics.pending.toLocaleString()}
          </p>
        </div>
        
        <div className="w-px h-12 bg-slate-200" />
        
        <div className="flex flex-col items-center">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-1">This Month</p>
          <p className="text-4xl font-black text-emerald-600 tracking-tighter tabular-nums leading-none">
            {metrics.thisMonth.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
