'use client';

import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import { useSessionScope } from '@/hooks/useSessionScope';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { LinesAndDotsLoader } from '@/components/LinesAndDotsLoader';

const MandEHub = dynamic(() => import('@/components/MandEHub'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <LinesAndDotsLoader progress={75} />
    </div>
  ),
});

export default function MandEPage() {
  const { status } = useSession();
  const scope = useSessionScope();
  const { patients: globalPatients = [], error, isLoading } = useSWRAllPatients(scope);

  // Debug log
  console.log('M&E Page - Patients loaded:', globalPatients?.length || 0);

  // Show loader while authenticating or loading data
  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LinesAndDotsLoader progress={50} />
      </div>
    );
  }

  // Show error state if data fetch fails
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="text-red-600 text-lg font-semibold">Failed to load data</div>
          <p className="text-sm text-slate-600">Please refresh the page or contact support</p>
        </div>
      </div>
    );
  }

  return <MandEHub globalPatients={globalPatients} />;
}
