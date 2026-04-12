'use client';

import PremiumDashboard from '@/components/PremiumDashboard';
import { DashboardErrorBoundary } from '@/components/DashboardErrorBoundary';

export default function DashboardPage() {
  return (
    <DashboardErrorBoundary>
      <PremiumDashboard />
    </DashboardErrorBoundary>
  );
}
