'use client';

import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import { useSessionScope } from '@/hooks/useSessionScope';
import { usePatientRealtime } from '@/hooks/usePatientRealtime';
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
  const { 
    patients: globalPatients = [], 
    isLoading,
    isPartialLoad,
    cappedReason,
    mutate
  } = useSWRAllPatients(scope, {
    autoFetchAll: true, // Explicit opt-in for complete dataset
    maxPages: 50,
    maxRecords: 500000
  });

  // Subscribe to real-time patient updates
  usePatientRealtime(() => {
    console.log('[FollowUp] Patient change detected, refreshing data...');
    mutate(); // Refresh SWR cache on any patient change
  }, scope);

  return (
    <div className="h-screen flex flex-col">
      {/* Partial load warning banner */}
      {isPartialLoad && cappedReason && (
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-2 bg-amber-50 border-b border-amber-200">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <span>⚠️</span>
            <span>{cappedReason}</span>
          </div>
          <button
            onClick={() => mutate()}
            className="text-xs text-amber-700 underline hover:text-amber-900 font-medium"
          >
            Retry Load
          </button>
        </div>
      )}
      
      <div className="flex-1 overflow-hidden">
        <CommandCenter
          globalPatients={globalPatients}
          isLoading={isLoading}
          initialFilter={null}
        />
      </div>
    </div>
  );
}
