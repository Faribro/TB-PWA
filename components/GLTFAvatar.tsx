'use client';

import { useRef, useEffect, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

interface GLTFAvatarProps {
  state?: any;
  power?: any;
  scale?: number;
  characterType?: 'sonic' | 'mimi' | 'genie' | 'robot';
  isWalking: boolean;
  isGreeting: boolean;
  isBoosting: boolean;
  isJumping?: boolean;
  isDragging?: boolean;
  edgeDir: 'forward' | 'backward';
  currentEdge: 'bottom' | 'right' | 'top' | 'left';
  legPhase?: number;
  anticipationLean?: number;
  momentum?: { x: number; y: number };
  panelMode?: boolean;
  mood?: 'idle' | 'talk' | 'excited' | 'alert';
  idleBehavior?: 'none' | 'dance' | 'impatient' | 'lookup' | 'stretch';
  returningFromIdle?: boolean;
  sonicMoodState?: 'normal' | 'worried' | 'happy' | 'urgent';
  mouseDirection?: 'left' | 'right' | null;
  isPausedForSonic?: boolean;
  groundedMode?: boolean;
}

const SONIC = {
  idle:    'Idle',
  float:   'Float',
  walk:    'Walk',
  jog:     'Jog',
  run:     'Run',
  forward: 'Forward',
  spin:    'Spin',
  up:      'Up',
} as const;

// Camera positions per mode — set once, not every frame
const CAM_NORMAL:   [number, number, number] = [0, 1.2, 5.5];
const CAM_GROUNDED: [number, number, number] = [0, 0.6, 5.5];
const CAM_TARGET_NORMAL:   [number, number, number] = [0, 1.0, 0];
const CAM_TARGET_GROUNDED: [number, number, number] = [0, 0.3, 0];

function GLTFAvatarContent({
  characterType = 'sonic',
  scale = 0.095,
  isWalking,
  isGreeting,
  isBoosting,
  isJumping = false,
  isDragging = false,
  edgeDir,
  currentEdge,
  anticipationLean = 0,
  momentum = { x: 0, y: 0 },
  panelMode = false,
  mood = 'idle',
  idleBehavior = 'none',
  returningFromIdle = false,
  sonicMoodState = 'normal',
  mouseDirection = null,
  isPausedForSonic = false,
  groundedMode = false,
}: GLTFAvatarProps) {
  const groupRef    = useRef<THREE.Group>(null);
  const fallbackRef = useRef<THREE.Mesh>(null);
  const speedRef    = useRef(0);
  const breathePhase    = useRef(0);
  const squashStretchRef = useRef(1);
  const armBoneRef  = useRef<THREE.Bone | null>(null);
  const headBoneRef = useRef<THREE.Bone | null>(null);

  const { camera } = useThree();

  // ── Set camera once when groundedMode changes — not every frame ──────────
  useEffect(() => {
    const pos    = groundedMode ? CAM_GROUNDED   : CAM_NORMAL;
    const target = groundedMode ? CAM_TARGET_GROUNDED : CAM_TARGET_NORMAL;
    camera.position.set(...pos);
    (camera as THREE.PerspectiveCamera).lookAt(...target);
  }, [groundedMode, camera]);

  const { scene, animations } = useGLTF('/models/sonic.glb');
  const { actions } = useAnimations(animations, groupRef) as {
    actions: Record<string, THREE.AnimationAction | null>;
  };

  // ── Bone discovery ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!scene) return;
    scene.traverse((child: any) => {
      if (!(child instanceof THREE.Bone)) return;
      if (/r.*arm|arm.*r|right.*arm|shoulder.*r|r.*shoulder|r.*hand|hand.*r/i.test(child.name))
        armBoneRef.current = child;
      if (/head|neck/i.test(child.name))
        headBoneRef.current = child;
    });
  }, [scene]);

  // ── Animation controller ──────────────────────────────────────────────────
  useEffect(() => {
    if (!actions || Object.keys(actions).length === 0) return;

    const play = (name: string, speed = 1.0, fadeIn = 0.15) => {
      Object.values(actions).forEach(a => a?.fadeOut(0.15));
      const action = actions[name];
      if (!action) return;
      action.reset().fadeIn(fadeIn).play();
      action.setEffectiveTimeScale(speed);
    };

    const id = setTimeout(() => {
      if (panelMode) {
        switch (mood) {
          case 'excited': play(SONIC.run,  1.0, 0.1); break;
          case 'talk':    play(SONIC.jog,  1.2, 0.2); break;
          case 'alert':   play(SONIC.run,  1.5, 0.1); break;
          default:        play(SONIC.walk, isPausedForSonic ? 0.2 : 0.8);
        }
        return;
      }
      if (isDragging)  { play(SONIC.float, 0.4, 0.1); return; }
      if (isJumping)   { play(SONIC.up,    1.2, 0.05); return; }
      if (isGreeting)  { play(SONIC.up, 0.9, 0.08); return; }
      if (idleBehavior && idleBehavior !== 'none') {
        switch (idleBehavior) {
          case 'dance':     play(SONIC.spin,  1.2, 0.1);  break;
          case 'impatient': play(SONIC.jog,   2.0, 0.1);  break;
          default:          play(SONIC.float, 0.6, 0.15); break;
        }
        return;
      }
      if (isBoosting) { play(SONIC.spin, 2.5, 0.05); return; }
      if (isWalking)  {
        anticipationLean > 0.1
          ? play(SONIC.forward, 2.8, 0.04)
          : play(SONIC.walk,    1.8, 0.08);
        return;
      }
      play(SONIC.idle, isPausedForSonic ? 0.2 : 1.0, 0.2);
    }, 35);

    return () => clearTimeout(id);
  }, [isWalking, isGreeting, isBoosting, isJumping, isDragging, actions, panelMode, mood, idleBehavior, isPausedForSonic, anticipationLean]);

  // ── Per-frame transform ───────────────────────────────────────────────────
  useFrame((_, delta) => {
    if (!scene && fallbackRef.current) {
      fallbackRef.current.position.y = Math.sin(Date.now() * 0.003) * 0.1 + 0.5;
      fallbackRef.current.rotation.y += 0.02;
      return;
    }
    if (!groupRef.current) return;

    const g = groupRef.current;

    // Panel mode
    if (panelMode) {
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, 0, 0.12);
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, 0, 0.12);
      g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, 0, 0.12);
      g.scale.setScalar(scale);
      g.position.y = isPausedForSonic ? 0 : Math.sin(Date.now() * 0.0018) * 0.03;
      g.position.x = 0;

      if (mood === 'talk' || mood === 'excited' || isPausedForSonic) {
        const t = Date.now() * 0.001;
        headBoneRef.current && (
          headBoneRef.current.rotation.x = THREE.MathUtils.lerp(headBoneRef.current.rotation.x, Math.sin(t * 4) * 0.08, 0.1),
          headBoneRef.current.rotation.y = THREE.MathUtils.lerp(headBoneRef.current.rotation.y, Math.cos(t * 2.5) * 0.12, 0.1)
        );
        if (armBoneRef.current) {
          armBoneRef.current.rotation.x = THREE.MathUtils.lerp(armBoneRef.current.rotation.x, Math.sin(t * 5) * 0.2, 0.15);
          armBoneRef.current.rotation.z = THREE.MathUtils.lerp(armBoneRef.current.rotation.z, 0.5 + Math.cos(t * 4) * 0.3, 0.15);
        }
        g.rotation.z = Math.sin(Date.now() * 0.003) * 0.02;
      } else {
        headBoneRef.current && (
          headBoneRef.current.rotation.x = THREE.MathUtils.lerp(headBoneRef.current.rotation.x, 0, 0.1),
          headBoneRef.current.rotation.y = THREE.MathUtils.lerp(headBoneRef.current.rotation.y, 0, 0.1)
        );
        armBoneRef.current && (
          armBoneRef.current.rotation.x = THREE.MathUtils.lerp(armBoneRef.current.rotation.x, 0, 0.1),
          armBoneRef.current.rotation.z = THREE.MathUtils.lerp(armBoneRef.current.rotation.z, 0, 0.1)
        );
      }
      return;
    }

    // Grounded mode
    if (groundedMode) {
      g.position.y = 0;
      g.rotation.x = 0;
      g.rotation.z = 0;
      g.scale.setScalar(scale);
      return;
    }

    // Dragging — dangle pose: hang limp, slight sway
    if (isDragging) {
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, 0.15, 0.1);
      g.rotation.z = Math.sin(Date.now() * 0.003) * 0.12; // sway
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, 0, 0.1);
      g.position.y = THREE.MathUtils.lerp(g.position.y, -0.1, 0.1);
      g.scale.setScalar(scale);
      return;
    }

    // Jumping — tuck and lean forward
    if (isJumping) {
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, -0.3, 0.12); // lean back slightly
      g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, -0.18, 0.12);
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, Math.PI / 2, 0.2);
      const jumpStretch = 1.08;
      g.scale.set(scale / jumpStretch, scale * jumpStretch, scale / jumpStretch);
      g.position.y = THREE.MathUtils.lerp(g.position.y, 0.12, 0.15);
      return;
    }

    // Greeting
    if (isGreeting) {
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, 0, 0.3);
      g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, 0, 0.3);
      const bobPhase = Date.now() * 0.006;
      g.position.y = Math.sin(bobPhase) * 0.18;
      const squash = 1 - Math.abs(Math.sin(bobPhase)) * 0.08;
      g.scale.set(scale / squash, scale * squash, scale / squash);
      if (armBoneRef.current) {
        armBoneRef.current.rotation.z = Math.sin(Date.now() * 0.008) * 1.0;
        armBoneRef.current.rotation.x = 0.6;
      }
      return;
    }

    // Idle behaviors
    if (idleBehavior === 'dance') {
      const t = Date.now() * 0.004;
      const bounce = Math.pow(Math.abs(Math.sin(t * 1.5)), 0.5) * 0.3;
      g.position.y = bounce;
      g.rotation.y += (0.5 + Math.sin(t * 0.5) * 0.35) * 0.04;
      const sq = 1 - (1 - bounce / 0.3) * 0.12;
      g.scale.set(scale / sq, scale * sq, scale / sq);
      return;
    }
    if (idleBehavior === 'impatient') {
      const t = Date.now() * 0.015;
      g.position.y = Math.pow(Math.max(0, Math.sin(t)), 3) * 0.09;
      g.rotation.z = Math.sin(Date.now() * 0.006) * 0.04;
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, Math.PI / 2 + Math.sin(Date.now() * 0.003) * 0.08, 0.08);
      return;
    }
    if (idleBehavior === 'lookup') {
      const phase = (Date.now() % 2000) / 2000;
      const curve = phase < 0.4 ? phase / 0.4 : phase < 0.7 ? 1 : (1 - phase) / 0.3;
      g.rotation.x = -curve * 0.35;
      g.rotation.z = Math.sin(Date.now() * 0.002) * 0.02;
      g.position.y = THREE.MathUtils.lerp(g.position.y, 0.04, 0.05);
      return;
    }
    if (idleBehavior === 'stretch') {
      const phase = (Date.now() % 3000) / 3000;
      const curve = phase < 0.3 ? phase / 0.3 : phase < 0.7 ? 1 : (1 - phase) / 0.3;
      const s = 1 + curve * 0.14;
      g.scale.set(scale / s, scale * s, scale / s);
      g.rotation.x = curve * 0.12;
      g.position.y = curve * 0.06;
      return;
    }

    // Returning from idle
    if (returningFromIdle) {
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, 0, 0.12);
      g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, 0, 0.12);
      g.position.y = THREE.MathUtils.lerp(g.position.y, 0, 0.12);
      const s = THREE.MathUtils.lerp(g.scale.x / scale, 1, 0.12) * scale;
      g.scale.setScalar(s);
    }

    // Mouse look when idle
    if (!isWalking && idleBehavior === 'none' && mouseDirection) {
      g.rotation.y = THREE.MathUtils.lerp(
        g.rotation.y,
        mouseDirection === 'right' ? Math.PI / 4 : -Math.PI / 4,
        0.08,
      );
    }

    // Arm reset
    if (armBoneRef.current) {
      armBoneRef.current.rotation.z = THREE.MathUtils.lerp(armBoneRef.current.rotation.z, 0, 0.12);
      armBoneRef.current.rotation.x = THREE.MathUtils.lerp(armBoneRef.current.rotation.x, 0, 0.12);
    }

    g.rotation.x = 0;
    g.scale.setScalar(scale);

    const speedMag = Math.hypot(momentum.x, momentum.y);
    const normSpeed = Math.min(speedMag / 0.3, 1);

    if (isWalking || isBoosting) {
      const stretch = 1 + normSpeed * (isBoosting ? 0.12 : 0.06);
      squashStretchRef.current = THREE.MathUtils.lerp(squashStretchRef.current, stretch, 0.15);
      g.scale.set(scale * squashStretchRef.current, scale / squashStretchRef.current, scale);

      if (isWalking && !isBoosting)
        g.position.y = Math.abs(Math.sin(Date.now() * 0.016)) * 0.04;

      if (sonicMoodState === 'urgent') {
        g.rotation.z = -(isBoosting ? 0.22 : 0.15) - 0.12;
        g.position.y = Math.abs(Math.sin(Date.now() * 0.014)) * 0.06;
      } else if (sonicMoodState === 'worried') {
        g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, 0.08, 0.05);
      } else if (sonicMoodState === 'happy') {
        g.position.y = Math.abs(Math.sin(Date.now() * 0.008)) * 0.08;
        g.rotation.z = Math.sin(Date.now() * 0.004) * 0.03 - (isBoosting ? 0.22 : 0.15) * 0.7;
      }
    } else {
      squashStretchRef.current = THREE.MathUtils.lerp(squashStretchRef.current, 1, 0.15);
    }

    // Rotation toward direction
    const targetRotY = (isWalking || isBoosting)
      ? Math.PI / 2
      : mouseDirection === 'right' ? Math.PI / 4
      : mouseDirection === 'left'  ? -Math.PI / 4
      : 0;
    g.rotation.y += (targetRotY - g.rotation.y) * 0.35;

    // Forward lean
    const baseLean   = (isWalking || isBoosting) ? (isBoosting ? 0.22 : 0.15) : 0;
    const shoulderRoll = isWalking && !isBoosting ? Math.sin(Date.now() * 0.008) * 0.025 : 0;
    g.rotation.z += (-baseLean + anticipationLean + shoulderRoll - g.rotation.z) * 0.2;

    // Vertical settle
    g.position.y += (0 - g.position.y) * 0.22;

    // Idle breathe
    if (!isWalking && Math.abs(g.position.y) < 0.05) {
      breathePhase.current += delta * 2;
      g.position.y = Math.sin(breathePhase.current) * 0.015;
    }
  });

  return (
    <>
      {/* Full lighting rig — owned here so no duplication from parent Canvas */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-3, 2, -3]} intensity={0.4} color="#4080ff" />
      <hemisphereLight args={['#87ceeb', '#654321', 0.3]} />
      <pointLight position={[0, 2, -2]} intensity={0.5} color="#ffffff" />

      {!scene ? (
        <mesh ref={fallbackRef} scale={scale * 10} position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.8} />
        </mesh>
      ) : (
        <group ref={groupRef} scale={scale} position={[0, 0, 0]}>
          <primitive object={scene} castShadow receiveShadow />
        </group>
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <shadowMaterial opacity={0.3} />
      </mesh>
    </>
  );
}

export default function GLTFAvatar(props: GLTFAvatarProps) {
  return (
    <Suspense fallback={null}>
      <GLTFAvatarContent {...props} />
    </Suspense>
  );
}

if (typeof window !== 'undefined') {
  useGLTF.preload('/models/sonic.glb');
}
