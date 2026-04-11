'use client';

import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import { useSessionScope } from '@/hooks/useSessionScope';
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
  const scope = useSessionScope();
  const { patients: globalPatients = [], isLoading } = useSWRAllPatients(scope);

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
