'use client';

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
  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 overflow-hidden">
        <CommandCenter
          initialFilter={null}
        />
      </div>
    </div>
  );
}
