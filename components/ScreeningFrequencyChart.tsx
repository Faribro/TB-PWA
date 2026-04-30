'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, Html, ContactShadows, PresentationControls, Sparkles, SoftShadows } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';

// --- Data & Colors ---
const STAGE_COLORS = {
  'Screened':      '#38bdf8',
  'Not Suspected': '#34d399',
  'Suspected':     '#fbbf24',
  'Referred':      '#a78bfa',
  'Diagnosed':     '#f472b6',
  'ATT Started':   '#fb923c',
} as const;

// Enforce minimum visual angle (in radians) so small slices stay visible
function enforceMinAngleRad(items: { name: string; value: number }[], minRad = 0.35) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) return items.map(i => ({ ...i, visualValue: 0 }));

  const totalRad = Math.PI * 2;
  const minFrac = minRad / totalRad;
  
  const boosted = items.map(item => {
    const frac = item.value / total;
    return { ...item, _boosted: frac < minFrac && item.value > 0 };
  });

  const boostCount = boosted.filter(i => i._boosted).length;
  const reservedFrac = boostCount * minFrac;
  const remainingFrac = 1 - reservedFrac;
  const largeTotal = boosted.filter(i => !i._boosted).reduce((s, i) => s + i.value, 0);

  return boosted.map(item => {
    if (item._boosted) {
      return { ...item, visualValue: total * minFrac };
    }
    if (largeTotal === 0) return { ...item, visualValue: item.value };
    const scaledFrac = (item.value / largeTotal) * remainingFrac;
    return { ...item, visualValue: total * scaledFrac };
  });
}

// --- 3D Slice Component ---
function Slice({ 
  innerRadius, 
  outerRadius, 
  startAngle, 
  endAngle, 
  depth, 
  color, 
  label, 
  value, 
  percentage,
  elevationOffset = 0,
  index = 0,
  activeStage = null
}: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [entryComplete, setEntryComplete] = useState(false);
  const entryProgress = useRef(0);

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    // Epsilon to avoid overlapping edges fighting
    const eps = 0.02;
    s.absarc(0, 0, outerRadius, startAngle + eps, endAngle - eps, false);
    s.lineTo(Math.cos(endAngle - eps) * innerRadius, Math.sin(endAngle - eps) * innerRadius);
    s.absarc(0, 0, innerRadius, endAngle - eps, startAngle + eps, true);
    s.lineTo(Math.cos(startAngle + eps) * outerRadius, Math.sin(startAngle + eps) * outerRadius);
    return s;
  }, [innerRadius, outerRadius, startAngle, endAngle]);

  const extrudeSettings = useMemo(() => ({
    depth,
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: 0.04,
    bevelThickness: 0.04,
  }), [depth]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Staggered entry animation
      if (!entryComplete) {
        const delay = index * 0.15; // Stagger by 150ms per slice
        const elapsed = state.clock.elapsedTime;
        if (elapsed > delay) {
          entryProgress.current = Math.min(entryProgress.current + delta * 2, 1);
          
          // Spring up from below
          const startZ = -2;
          const targetZ = elevationOffset;
          meshRef.current.position.z = THREE.MathUtils.lerp(startZ, targetZ, entryProgress.current);
          
          // Scale from 0 to 1
          const scale = THREE.MathUtils.lerp(0.01, 1.0, entryProgress.current);
          meshRef.current.scale.y = scale;
          
          if (entryProgress.current >= 1) {
            setEntryComplete(true);
          }
        }
      } else {
        // Interactive hover/active state
        const isActive = hovered || activeStage === label;
        const target = isActive ? 0.4 : elevationOffset;
        meshRef.current.position.z = THREE.MathUtils.damp(meshRef.current.position.z, target, 4, delta);
        
        const scaleTarget = isActive ? 1.05 : 1.0;
        meshRef.current.scale.x = THREE.MathUtils.damp(meshRef.current.scale.x, scaleTarget, 4, delta);
        meshRef.current.scale.y = THREE.MathUtils.damp(meshRef.current.scale.y, scaleTarget, 4, delta);
      }
    }
  });

  // Calculate mid angle for label positioning
  const midAngle = startAngle + (endAngle - startAngle) / 2;
  const labelRadius = outerRadius + 0.5;
  const labelX = Math.cos(midAngle) * labelRadius;
  const labelY = Math.sin(midAngle) * labelRadius;

  // Determine visual state
  const isActive = hovered || activeStage === label;
  const isDimmed = activeStage && activeStage !== label;

  return (
    <group>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <meshPhysicalMaterial 
          color={new THREE.Color(color).convertSRGBToLinear()}
          roughness={0.15}
          metalness={0.1}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          transmission={isActive ? 0.2 : 0.0}
          thickness={0.5}
          opacity={isDimmed ? 0.3 : 1.0}
          transparent={isDimmed}
        />
      </mesh>

      {/* Interactive 3D Label */}
      <Html 
        position={[labelX, labelY, depth + (isActive ? 0.8 : 0.2)]} 
        center 
        style={{ pointerEvents: 'none', transition: 'all 0.3s' }}
        zIndexRange={[100, 0]}
      >
        <div className={`flex flex-col items-center transition-all duration-300 ${isActive ? 'scale-125 opacity-100 drop-shadow-2xl' : 'scale-100 opacity-80 drop-shadow-md'}`}>
          <div 
            className="px-2.5 py-1 rounded-full backdrop-blur-md border border-white/20 text-[9px] font-black uppercase tracking-widest text-white whitespace-nowrap shadow-xl"
            style={{ backgroundColor: `${color}dd` }}
          >
            {label}
          </div>
          {isActive && (
            <div className="mt-1 bg-slate-900/90 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/10 flex flex-col items-center shadow-2xl">
              <span className="text-white text-lg font-black leading-tight">{value.toLocaleString()}</span>
              {percentage && <span className="text-slate-400 text-[10px] font-bold">{percentage}%</span>}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

// --- The 3D Scene Assembly ---
function PieScene({ data, activeStage }: { data: any[]; activeStage: string | null }) {
  const get = (stage: string) => data.find((d: any) => d.stage === stage)?.value ?? 0;
  const screened = get('Screened');
  
  // Single Unified Cascade Ring
  const cascadeRaw = [
    { name: 'Not Suspected', value: get('Not Suspected') },
    { name: 'Suspected',     value: get('Suspected') },
    { name: 'Referred',      value: get('Referred') },
    { name: 'Diagnosed',     value: get('Diagnosed') },
    { name: 'ATT Started',   value: get('ATT Started') },
  ].filter(d => d.value > 0);
  const cascadeData = enforceMinAngleRad(cascadeRaw, 0.35);

  return (
    <PresentationControls
      global
      rotation={[0, 0, 0]}
      polar={[-Math.PI / 3, Math.PI / 3]} // limit vertical rotation
      azimuth={[-Math.PI / 2, Math.PI / 2]} // limit horizontal rotation
      config={{ mass: 2, tension: 400 }}
      snap={{ mass: 4, tension: 150 }}
    >
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <group rotation={[-Math.PI / 3, 0, 0]}>
          
          {/* Single Unified Cascade Ring */}
          {(() => {
            let currentAngle = 0;
            const totalVisual = cascadeData.reduce((s, d) => s + d.visualValue, 0);
            return cascadeData.map((item, i) => {
              const angleSpan = (item.visualValue / totalVisual) * Math.PI * 2;
              const start = currentAngle;
              currentAngle += angleSpan;
              const pct = screened > 0 ? ((item.value / screened) * 100).toFixed(1) : '0';
              return (
                <Slice 
                  key={`cascade-${item.name}`}
                  innerRadius={1.2}
                  outerRadius={2.8}
                  startAngle={start}
                  endAngle={start + angleSpan}
                  depth={0.5}
                  color={STAGE_COLORS[item.name as keyof typeof STAGE_COLORS]}
                  label={item.name}
                  value={item.value}
                  percentage={pct}
                  elevationOffset={0}
                  index={i}
                  activeStage={activeStage}
                />
              );
            });
          })()}

          {/* Atmospheric Particles */}
          <Sparkles count={80} scale={8} size={2} speed={0.4} opacity={0.4} color="#a78bfa" />

          {/* Center Hub */}
          <group position={[0, 0, 0.4]}>
            {/* Inner Glow */}
            <pointLight position={[0, 0, 0]} intensity={0.5} color="#4ade80" />
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.6, 0.6, 0.2, 32]} />
              <meshPhysicalMaterial color="#ffffff" metalness={0.8} roughness={0.2} clearcoat={1} />
            </mesh>
            <Html position={[0, 0, 0.2]} center style={{ pointerEvents: 'none' }}>
              <div className="flex flex-col items-center bg-white/80 backdrop-blur-md w-24 h-24 rounded-full justify-center shadow-[0_10px_30px_rgba(0,0,0,0.2)] border border-white">
                <span className="text-2xl font-black text-slate-900 leading-none">{screened.toLocaleString()}</span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Screened</span>
              </div>
            </Html>
          </group>

        </group>
      </Float>

      {/* Cinematic Lighting & Environment */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
      <spotLight position={[-10, 10, 10]} intensity={1} angle={0.3} penumbra={1} castShadow />
      <Environment preset="city" />
      <ContactShadows position={[0, -2, 0]} opacity={0.6} scale={15} blur={2.5} far={4} color="#0f172a" />
      <SoftShadows size={25} samples={10} focus={0.5} />
    </PresentationControls>
  );
}

// --- Main Export ---
export function ScreeningFrequencyChart({ data }: { data: any[] }) {
  const [mounted, setMounted] = useState(false);
  const [activeStage, setActiveStage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-100">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-[340px] rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing">
      {/* 2D Background Enhancements */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/80 via-white/40 to-slate-100/80 backdrop-blur-3xl z-0" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-300/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-fuchsia-300/20 rounded-full blur-[100px] pointer-events-none" />

      {/* 3D Canvas */}
      <div className="absolute inset-0 z-10">
        <Canvas shadows dpr={[1, 2]} camera={{ position: [0, -1, 9], fov: 45 }}>
          <PieScene data={data} activeStage={activeStage} />
        </Canvas>
      </div>

      {/* Data Tiles Legend */}
      <div className="absolute bottom-3 left-0 right-0 z-20 px-6">
        <div className="flex flex-wrap justify-center gap-3">
          {data.filter(item => item.stage !== 'Screened').map((item) => {
            const c = STAGE_COLORS[item.stage as keyof typeof STAGE_COLORS];
            return (
              <motion.div
                key={item.stage}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-br from-white/90 to-white/50 backdrop-blur-md shadow-sm border cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
                style={{ borderColor: `${c}40` }}
                onMouseEnter={() => setActiveStage(item.stage)}
                onMouseLeave={() => setActiveStage(null)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span 
                  className="text-[10px] font-black uppercase tracking-widest" 
                  style={{ color: c }}
                >
                  {item.stage}
                </span>
                <div className="w-px h-3 bg-slate-200" />
                <span className="text-xs font-black text-slate-800 drop-shadow-sm">
                  {item.value.toLocaleString()}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
