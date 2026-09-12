'use client';

import dynamic from 'next/dynamic';
import { DashboardErrorBoundary } from '@/components/DashboardErrorBoundary';

// ── Skeleton shown while the heavy dashboard bundle loads ───────────
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--gov-surface,#f8fafc)] flex flex-col">
      {/* Header skeleton */}
      <div className="h-14 bg-[var(--gov-primary,#1e40af)] animate-pulse" />
      {/* KPI cards */}
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-200 animate-pulse" />
        ))}
      </div>
      {/* Chart area */}
      <div className="px-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 h-64 rounded-xl bg-slate-200 animate-pulse" />
        <div className="h-64 rounded-xl bg-slate-200 animate-pulse" />
      </div>
      {/* Table skeleton */}
      <div className="px-6 mt-6">
        <div className="h-8 w-48 rounded bg-slate-200 animate-pulse mb-3" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 rounded bg-slate-100 animate-pulse mb-2" />
        ))}
      </div>
    </div>
  );
}

// ── Lazy-load the full dashboard — defers ~200 KB of chart/map JS ───
const PremiumDashboard = dynamic(
  () => import('@/components/PremiumDashboard'),
  {
    ssr: false,
    loading: () => <DashboardSkeleton />,
  }
);

export default function DashboardPage() {
  return (
    <DashboardErrorBoundary>
      <PremiumDashboard />
    </DashboardErrorBoundary>
  );
}
