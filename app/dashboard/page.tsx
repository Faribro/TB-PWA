'use client';

import SettingsTab from '@/components/SettingsTab';
import { DashboardErrorBoundary } from '@/components/DashboardErrorBoundary';

export default function DashboardPage() {
  return (
    <DashboardErrorBoundary>
      <SettingsTab />
    </DashboardErrorBoundary>
  );
}
