'use client';

import { useEffect, useState } from 'react';
import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import { useSessionScope, isSuperuser } from '@/hooks/useSessionScope';
import { useEntityStore } from '@/stores/useEntityStore';
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
  const scope = useSessionScope();

  // Task 3: Hard block — never render or query until scope is resolved.
  // This prevents a PM from briefly seeing 0 patients before filters apply.
  if (scope === null) {
    return (
      <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
        <div className="flex-1 flex gap-6 p-8">
          <div className="w-1/2 flex flex-col gap-6">
            <div className="h-[400px] bg-slate-200/50 animate-pulse rounded-2xl border border-slate-100 shadow-sm" />
            <div className="flex-1 bg-slate-200/50 animate-pulse rounded-2xl border border-slate-100 shadow-sm" />
          </div>
          <div className="w-1/2 bg-slate-200/50 animate-pulse rounded-2xl border border-slate-100 shadow-sm" />
        </div>
        <div className="h-[100px] shrink-0 bg-white border-t border-slate-200 flex items-center justify-between px-8 z-50">
          <div className="w-56 h-12 bg-slate-100 animate-pulse rounded-full" />
          <div className="flex gap-16">
            <div className="w-28 h-12 bg-slate-100 animate-pulse rounded-lg" />
            <div className="w-28 h-12 bg-slate-100 animate-pulse rounded-lg" />
            <div className="w-28 h-12 bg-slate-100 animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return <VertexContent scope={scope} />;
}

// Separated so the scope is guaranteed non-null inside this component
function VertexContent({ scope }: { scope: NonNullable<ReturnType<typeof useSessionScope>> }) {
  const { data: globalPatients = [], isLoading } = useSWRAllPatients(scope);
  const [metrics, setMetrics] = useState({ total: 0, pending: 0, thisMonth: 0, onATT: 0 });
  const national = isSuperuser(scope);
  const setFilter = useEntityStore(s => s.setGlobalFilter);

  useEffect(() => {
    async function fetchMetrics() {
      let totalQ = supabase.from('patients').select('*', { count: 'exact', head: true });
      let pendingQ = supabase.from('patients').select('*', { count: 'exact', head: true })
        .eq('xray_result', 'ABNORMAL')
        .is('treatment_start_date', null)
        .is('att_start_date', null)
        .is('referral_date', null);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      let monthQ = supabase.from('patients').select('*', { count: 'exact', head: true })
        .gte('submitted_on', startOfMonth.toISOString());
        
      let attQ = supabase.from('patients').select('*', { count: 'exact', head: true })
        .not('att_start_date', 'is', null);

      // scope.state is null for superusers → no filter applied → All India
      if (scope.state) {
        totalQ   = totalQ.eq('screening_state', scope.state);
        pendingQ = pendingQ.eq('screening_state', scope.state);
        monthQ   = monthQ.eq('screening_state', scope.state);
        attQ     = attQ.eq('screening_state', scope.state);
      }
      if (scope.district) {
        totalQ   = totalQ.eq('screening_district', scope.district);
        pendingQ = pendingQ.eq('screening_district', scope.district);
        monthQ   = monthQ.eq('screening_district', scope.district);
        attQ     = attQ.eq('screening_district', scope.district);
      }

      const [{ count: total }, { count: pending }, { count: thisMonth }, { count: onATT }] =
        await Promise.all([totalQ, pendingQ, monthQ, attQ]);

      setMetrics({ total: total ?? 0, pending: pending ?? 0, thisMonth: thisMonth ?? 0, onATT: onATT ?? 0 });
    }

    fetchMetrics();
    const id = setInterval(fetchMetrics, 30000);
    return () => clearInterval(id);
  }, [scope]);

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
    </div>
  );
}
