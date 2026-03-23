import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EntityState, EntityPower } from '@/stores/useEntityStore';

const EMOTION_COLORS = {
  idle: '#00e5ff',
  patrolling: '#00ff88',
  investigating: '#ffab00',
  alerting: '#ff1744',
  reporting: '#00e676',
};

interface SonicAvatarProps {
  state: EntityState;
  power: EntityPower;
  scale?: number;
}

// Simplified Sonic-style character (hedgehog)
export default function SonicAvatar({ state, power, scale = 0.8 }: SonicAvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const legsRef = useRef<THREE.Group>(null);
  const color = EMOTION_COLORS[state];
  
  useFrame((frameState, delta) => {
    const t = frameState.clock.elapsedTime;
    
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
    }
    
    if (headRef.current) {
      headRef.current.position.y = 0.3 + Math.sin(t * 3) * 0.02;
    }
    
    // Running animation
    if (legsRef.current && state === 'patrolling') {
      legsRef.current.rotation.x = Math.sin(t * 10) * 0.3;
    }
  });
  
  return (
    <group ref={groupRef} scale={scale}>
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
      <pointLight position={[2, 2, 2]} intensity={0.8} color="#ffffff" />
      <pointLight position={[-2, 1, -1]} intensity={0.4} color="#4488ff" />
      <spotLight position={[0, 5, 3]} angle={0.4} penumbra={1} intensity={1} castShadow color={color} />
      
      {/* Head (hedgehog style) */}
      <group ref={headRef} position={[0, 0.3, 0]}>
        {/* Main head sphere */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.25, 32, 32]} />
          <meshPhysicalMaterial 
            color="#0055dd"
            roughness={0.2}
            metalness={0.8}
            clearcoat={1}
            clearcoatRoughness={0.1}
            envMapIntensity={1.5}
          />
        </mesh>
        
        {/* Spikes */}
        {[0, 60, 120, 180, 240, 300].map((angle, i) => (
          <mesh
            key={i}
            position={[
              Math.cos((angle * Math.PI) / 180) * 0.2,
              0.1,
              Math.sin((angle * Math.PI) / 180) * 0.2
            ]}
            rotation={[0, (angle * Math.PI) / 180, 0]}
            castShadow
          >
            <coneGeometry args={[0.08, 0.3, 12]} />
            <meshPhysicalMaterial 
              color="#003399"
              roughness={0.15}
              metalness={0.9}
              clearcoat={0.8}
            />
          </mesh>
        ))}
        
        {/* Eyes - white with gloss */}
        <mesh position={[-0.08, 0.05, 0.2]} castShadow>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshPhysicalMaterial 
            color="#ffffff"
            roughness={0.1}
            metalness={0.1}
            clearcoat={1}
            clearcoatRoughness={0.05}
          />
        </mesh>
        <mesh position={[0.08, 0.05, 0.2]} castShadow>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshPhysicalMaterial 
            color="#ffffff"
            roughness={0.1}
            metalness={0.1}
            clearcoat={1}
            clearcoatRoughness={0.05}
          />
        </mesh>
        
        {/* Pupils - glossy black */}
        <mesh position={[-0.08, 0.05, 0.26]}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshPhysicalMaterial 
            color="#000000"
            roughness={0.05}
            metalness={0.9}
            clearcoat={1}
          />
        </mesh>
        <mesh position={[0.08, 0.05, 0.26]}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshPhysicalMaterial 
            color="#000000"
            roughness={0.05}
            metalness={0.9}
            clearcoat={1}
          />
        </mesh>
        
        {/* Nose - shiny black */}
        <mesh position={[0, -0.02, 0.24]} castShadow>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshPhysicalMaterial 
            color="#000000"
            roughness={0.1}
            metalness={0.8}
            clearcoat={1}
          />
        </mesh>
      </group>
      
      {/* Body */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshPhysicalMaterial 
          color="#0055dd"
          roughness={0.2}
          metalness={0.8}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </mesh>
      
      {/* Belly - peach colored */}
      <mesh position={[0, 0, 0.17]} castShadow>
        <sphereGeometry args={[0.16, 32, 32, 0, Math.PI]} />
        <meshPhysicalMaterial 
          color="#ffcc99"
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>
      
      {/* Legs */}
      <group ref={legsRef} position={[0, -0.2, 0]}>
        {/* Left leg */}
        <mesh position={[-0.1, -0.1, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 0.2, 16]} />
          <meshPhysicalMaterial 
            color="#0055dd"
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
        {/* Left shoe - glossy red */}
        <mesh position={[-0.1, -0.25, 0.05]} castShadow>
          <boxGeometry args={[0.14, 0.1, 0.2]} />
          <meshPhysicalMaterial 
            color="#cc0000"
            roughness={0.1}
            metalness={0.9}
            clearcoat={1}
            clearcoatRoughness={0.05}
          />
        </mesh>
        {/* Left shoe stripe */}
        <mesh position={[-0.1, -0.24, 0.15]}>
          <boxGeometry args={[0.15, 0.03, 0.02]} />
          <meshPhysicalMaterial 
            color="#ffffff"
            roughness={0.1}
            metalness={0.5}
          />
        </mesh>
        
        {/* Right leg */}
        <mesh position={[0.1, -0.1, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 0.2, 16]} />
          <meshPhysicalMaterial 
            color="#0055dd"
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
        {/* Right shoe - glossy red */}
        <mesh position={[0.1, -0.25, 0.05]} castShadow>
          <boxGeometry args={[0.14, 0.1, 0.2]} />
          <meshPhysicalMaterial 
            color="#cc0000"
            roughness={0.1}
            metalness={0.9}
            clearcoat={1}
            clearcoatRoughness={0.05}
          />
        </mesh>
        {/* Right shoe stripe */}
        <mesh position={[0.1, -0.24, 0.15]}>
          <boxGeometry args={[0.15, 0.03, 0.02]} />
          <meshPhysicalMaterial 
            color="#ffffff"
            roughness={0.1}
            metalness={0.5}
          />
        </mesh>
      </group>
      
      {/* Arms with hands */}
      <group>
        {/* Left arm */}
        <mesh position={[-0.2, 0.05, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.15, 12]} />
          <meshPhysicalMaterial 
            color="#ffcc99"
            roughness={0.3}
            metalness={0.1}
          />
        </mesh>
        {/* Left hand */}
        <mesh position={[-0.2, -0.05, 0]} castShadow>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshPhysicalMaterial 
            color="#ffffff"
            roughness={0.2}
            metalness={0.1}
            clearcoat={0.5}
          />
        </mesh>
        
        {/* Right arm */}
        <mesh position={[0.2, 0.05, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.15, 12]} />
          <meshPhysicalMaterial 
            color="#ffcc99"
            roughness={0.3}
            metalness={0.1}
          />
        </mesh>
        {/* Right hand */}
        <mesh position={[0.2, -0.05, 0]} castShadow>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshPhysicalMaterial 
            color="#ffffff"
            roughness={0.2}
            metalness={0.1}
            clearcoat={0.5}
          />
        </mesh>
      </group>
      
      {/* Glow aura */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.6, 24, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={state === 'alerting' ? 0.4 : 0.15}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Scan beam power */}
      {power === 'scan' && (
        <mesh position={[0, 0.3, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.08, 3, 16]} />
          <meshBasicMaterial
            color="#00e5ff"
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
      
      {/* Alert ring */}
      {state === 'alerting' && (
        <mesh position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.65, 32]} />
          <meshBasicMaterial
            color="#ff1744"
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
