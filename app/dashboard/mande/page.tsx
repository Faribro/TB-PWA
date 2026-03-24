'use client';

import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import { useSessionScope } from '@/hooks/useSessionScope';
import dynamic from 'next/dynamic';
import { LinesAndDotsLoader } from '@/components/LinesAndDotsLoader';

const MandEHub = dynamic(() => import('@/components/MandEHub'), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center">
      <LinesAndDotsLoader progress={75} />
    </div>
  ),
});

export default function MandEPage() {
  const scope = useSessionScope();
  const { data: globalPatients = [] } = useSWRAllPatients(scope);

  return (
    <div className="h-screen">
      <MandEHub globalPatients={globalPatients} />
    </div>
  );
}
