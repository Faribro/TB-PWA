'use client';

import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import dynamic from 'next/dynamic';
import { LinesAndDotsLoader } from '@/components/LinesAndDotsLoader';

const CommandCenter = dynamic(() => import('@/components/CommandCenter'), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center">
      <LinesAndDotsLoader progress={75} />
    </div>
  ),
});

export default function FollowUpPage() {
  const { data: globalPatients = [], isLoading } = useSWRAllPatients();

  return (
    <div className="h-screen">
      <CommandCenter
        globalPatients={globalPatients}
        isLoading={isLoading}
        initialFilter={null}
      />
    </div>
  );
}
