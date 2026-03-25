'use client';

import SettingsTab from '@/components/SettingsTab';
import { DashboardErrorBoundary } from '@/components/DashboardErrorBoundary';

export default function SettingsPage() {
  return (
    <DashboardErrorBoundary>
      <SettingsTab />
    </DashboardErrorBoundary>
  );
}
