'use client';

import { Canvas } from '@react-three/fiber';
import dynamic from 'next/dynamic';
import type { SonicCanvasProps } from './SonicCanvas.types';

const GLTFAvatar = dynamic(() => import('./GLTFAvatar'), { ssr: false });

export default function SonicCanvasInner(props: SonicCanvasProps) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', pointerEvents: 'none' }}>
    <Canvas
      style={{ width: '100%', height: '100%', background: 'transparent', display: 'block', position: 'absolute', inset: 0 }}
      camera={{ position: [0, 1.2, 5.5], fov: 35 }}
      dpr={1}
      frameloop="always"
      gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
    >
      <GLTFAvatar
        characterType={props.characterType ?? 'sonic'}
        edgeDir={props.edgeDir ?? 'forward'}
        isWalking={props.isWalking ?? false}
        isGreeting={props.isGreeting ?? false}
        isBoosting={props.isBoosting ?? false}
        isJumping={props.isJumping ?? false}
        isDragging={props.isDragging ?? false}
        currentEdge={props.currentEdge ?? 'bottom'}
        anticipationLean={0}
        momentum={props.momentum ?? { x: 0, y: 0 }}
        idleBehavior={props.idleBehavior ?? 'none'}
        returningFromIdle={props.returningFromIdle ?? false}
        sonicMoodState={props.sonicMoodState ?? 'normal'}
        mouseDirection={props.mouseDirection ?? null}
        mood={props.mood ?? props.sonicMood ?? 'idle'}
        isPausedForSonic={props.isPausedForSonic}
        groundedMode={false}
      />
    </Canvas>
    </div>
  );
}
