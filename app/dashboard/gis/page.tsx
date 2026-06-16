'use client';

import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import { useSessionScope } from '@/hooks/useSessionScope';
import dynamic from 'next/dynamic';
import { LinesAndDotsLoader } from '@/components/LinesAndDotsLoader';
import { RealtimeTether } from '@/components/RealtimeTether';

const SpatialIntelligenceMap = dynamic(() => import('@/components/SpatialIntelligenceMap'), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center bg-white">
      <LinesAndDotsLoader progress={75} />
    </div>
  ),
});

export default function GISPage() {
  const scope = useSessionScope();
  const { patients: globalPatients = [] } = useSWRAllPatients(scope);

  return (
    <div className="h-full w-full overflow-hidden" data-map-container>
      <SpatialIntelligenceMap globalPatients={globalPatients} />
      <RealtimeTether />
    </div>
  );
}
