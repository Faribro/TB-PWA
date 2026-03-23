'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const FloatingEntity = dynamic(() => import('./FloatingEntity'), { ssr: false, loading: () => null });

export default function ClientFloatingEntity() {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  return (
    <div
      suppressHydrationWarning
      className="fixed inset-0 z-50"
      style={{ pointerEvents: 'none' }}
    >
      {ready && <FloatingEntity />}
    </div>
  );
}
