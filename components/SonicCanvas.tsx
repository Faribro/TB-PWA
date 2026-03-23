'use client';

import dynamic from 'next/dynamic';
import type { SonicCanvasProps } from './SonicCanvas.types';

const SonicCanvasInner = dynamic(() => import('./SonicCanvasInner'), {
  ssr: false,
  loading: () => null,
});

export type { SonicCanvasProps };

export default function SonicCanvas(props: SonicCanvasProps) {
  return <SonicCanvasInner {...props} />;
}
