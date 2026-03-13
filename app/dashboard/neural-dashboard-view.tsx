'use client';

import { memo } from 'react';
import Vertex from '@/components/Vertex';

interface NeuralDashboardViewProps {
  globalPatients?: any[];
  isLoading?: boolean;
  onNavigateToPipeline?: () => void;
  filter?: any;
  onSetFilter?: (f: any) => void;
}

/* ─── Empty state ─── */
function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-center">
       <h3 className="text-white font-bold text-xl">No Patient Data</h3>
    </div>
  );
}

/* ─── Main component: Chronos Command Deck ─── */
const NeuralDashboardView = memo(function NeuralDashboardView({
  globalPatients = [],
  isLoading = false,
}: NeuralDashboardViewProps) {
  if (!globalPatients.length && !isLoading) {
    return <EmptyState />;
  }

  return (
    <div className="w-full h-full">
      <Vertex />
    </div>
  );
});

export default NeuralDashboardView;