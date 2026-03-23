'use client';

import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import dynamic from 'next/dynamic';
import { LinesAndDotsLoader } from '@/components/LinesAndDotsLoader';

const NeuralDashboard = dynamic(() => import('@/app/dashboard/neural-dashboard-view'), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center">
      <LinesAndDotsLoader progress={75} />
    </div>
  ),
});

export default function VertexPage() {
  const { data: globalPatients = [], isLoading } = useSWRAllPatients();

  return (
    <div className="h-screen">
      <NeuralDashboard
        globalPatients={globalPatients}
        isLoading={isLoading}
        filter={null}
        onSetFilter={() => {}}
      />
    </div>
  );
}
