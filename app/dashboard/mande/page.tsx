'use client';

import { useSWRAllPatients } from '@/hooks/useSWRPatients';
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
  const { data: globalPatients = [] } = useSWRAllPatients();

  return (
    <div className="h-screen">
      <MandEHub globalPatients={globalPatients} />
    </div>
  );
}
