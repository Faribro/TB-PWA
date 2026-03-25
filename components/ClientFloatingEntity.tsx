'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const FloatingEntity = dynamic(
  () => import('./FloatingEntity').catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null }
);

export default function ClientFloatingEntity() {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => { setReady(true); }, []);

  if (failed) return null;

  return (
    <div
      suppressHydrationWarning
      className="fixed inset-0 z-[45] pointer-events-none"
      onError={() => setFailed(true)}
    >
      {ready && (
        <div className="pointer-events-auto">
          <FloatingEntity />
        </div>
      )}
    </div>
  );
}
