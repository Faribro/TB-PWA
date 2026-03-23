import { useRef, useMemo } from 'react';
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

interface MacroAvatarProps {
  state: EntityState;
  power: EntityPower;
}

// Full-size Mimi character for macro mode
export default function MacroAvatar({ state, power }: MacroAvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  
  const color = useMemo(() => new THREE.Color(EMOTION_COLORS[state]), [state]);
  
  useFrame((frameState, delta) => {
    const t = frameState.clock.elapsedTime;
    
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
    }
    
    if (headRef.current) {
      headRef.current.position.y = 0.2 + Math.sin(t * 2) * 0.03;
    }
    
    if (rightArmRef.current && state === 'reporting') {
      rightArmRef.current.rotation.z = Math.sin(t * 5) * 0.6 - 0.5;
    }
    
    if (leftLegRef.current && state === 'alerting') {
      leftLegRef.current.position.y = -0.46 + Math.abs(Math.sin(t * 8)) * 0.05;
    }
  });
  
  return (
    <group ref={groupRef} scale={1.2}>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 1, 1]} intensity={2} color={color} />
      <pointLight position={[-1, 0, 1]} intensity={1} color="#ffffff" />
      
      {/* Head */}
      <group ref={headRef} position={[0, 0.2, 0]}>
        {/* Face */}
        <mesh castShadow>
          <sphereGeometry args={[0.3, 24, 24, Math.PI * -0.5]} />
          <meshStandardMaterial color="#f5deb3" roughness={0.6} metalness={0.1} />
        </mesh>
        
        {/* Left Ear */}
        <mesh position={[0.24, 0.27, 0.1]} rotation={[0.15, 0, -0.35]} castShadow>
          <coneGeometry args={[0.15, 0.29, 3, 1, false, 1.2]} />
          <meshStandardMaterial color="#cccccc" roughness={0.6} />
        </mesh>
        
        {/* Right Ear */}
        <mesh position={[-0.24, 0.27, 0.1]} rotation={[0.15, 0, 0.35]} castShadow>
          <coneGeometry args={[0.15, 0.29, 3, 1, false, 1.2]} />
          <meshStandardMaterial color="#cccccc" roughness={0.6} />
        </mesh>
        
        {/* Eyes */}
        <mesh position={[-0.1, 0.05, 0.25]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        <mesh position={[0.1, 0.05, 0.25]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        
        {/* Nose */}
        <mesh position={[0, 0, 0.28]}>
          <sphereGeometry args={[0.03, 12, 12]} />
          <meshStandardMaterial color="#ffb6c1" roughness={0.4} />
        </mesh>
      </group>
      
      {/* Body */}
      <group position={[0, -0.2, 0]}>
        {/* Top Body */}
        <mesh castShadow>
          <cylinderGeometry args={[0.1, 0.2, 0.4, 24, 1, false, Math.PI]} />
          <meshStandardMaterial color="#8b4513" roughness={0.7} />
        </mesh>
        
        {/* Bottom Body */}
        <mesh position={[0, 0, 0]} castShadow>
          <sphereGeometry args={[0.2825, 24, 24, 0, Math.PI * 2, 2.36, 0.785]} />
          <meshStandardMaterial color="#493c2b" roughness={0.7} />
        </mesh>
      </group>
      
      {/* Left Arm */}
      <group position={[0.12, -0.13, 0]} rotation={[0, 0, -0.785]}>
        <mesh castShadow>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#a46422" roughness={0.7} />
        </mesh>
        <mesh position={[0.05, 0, 0]} rotation={[0, 0, 1.57]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.1, 12]} />
          <meshStandardMaterial color="#a46422" roughness={0.7} />
        </mesh>
        <mesh position={[0.1, 0, 0]} castShadow>
          <sphereGeometry args={[0.075, 12, 12]} />
          <meshStandardMaterial color="#cccccc" roughness={0.6} />
        </mesh>
      </group>
      
      {/* Right Arm - with wave animation */}
      <group ref={rightArmRef} position={[-0.12, -0.13, 0]} rotation={[0, 0, -3.93]}>
        <mesh castShadow>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#a46422" roughness={0.7} />
        </mesh>
        <mesh position={[0.05, 0, 0]} rotation={[0, 0, 1.57]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.1, 12]} />
          <meshStandardMaterial color="#a46422" roughness={0.7} />
        </mesh>
        <mesh position={[0.1, 0, 0]} castShadow>
          <sphereGeometry args={[0.075, 12, 12]} />
          <meshStandardMaterial color="#cccccc" roughness={0.6} />
        </mesh>
      </group>
      
      {/* Left Leg */}
      <group ref={leftLegRef} position={[0.09, -0.46, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#493c2b" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.1, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.2, 12]} />
          <meshStandardMaterial color="#493c2b" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.25, 0.01]} rotation={[1.57, 1.57, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.15, 12, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#1b2632" roughness={0.6} />
        </mesh>
      </group>
      
      {/* Right Leg */}
      <group position={[-0.09, -0.46, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#493c2b" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.1, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.2, 12]} />
          <meshStandardMaterial color="#493c2b" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.25, 0.01]} rotation={[1.57, 1.57, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.15, 12, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#1b2632" roughness={0.6} />
        </mesh>
      </group>
      
      {/* Glow aura based on state */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.8, 24, 24]} />
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
        <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.75, 32]} />
          <meshBasicMaterial
            color="#ff1744"
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Shockwave effect for alerting */}
      {state === 'alerting' && (
        <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1, 32]} />
          <meshBasicMaterial
            color="#ff1744"
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
