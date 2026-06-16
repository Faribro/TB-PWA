import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';

// Import types
type PhaseCellProps = ComponentProps<typeof import('./PhaseCell').PhaseCell>;

// Lazy load heavy components with proper typing
export const PhaseCell = dynamic(
  () => import('./PhaseCell').then(mod => ({ default: mod.PhaseCell })),
  {
    loading: () => <div className="w-20 h-6 bg-slate-100 animate-pulse rounded" />
  }
) as React.ComponentType<PhaseCellProps>;

