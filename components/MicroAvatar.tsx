import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { EntityState, EntityPower } from '@/stores/useEntityStore';

const EMOTION_COLORS = {
  idle: '#00e5ff',
  patrolling: '#00ff88',
  investigating: '#ffab00',
  alerting: '#ff1744',
  reporting: '#00e676',
};

interface MicroAvatarProps {
  state: EntityState;
  power: EntityPower;
}

// Simplified Mimi character for micro size
export default function MicroAvatar({ state, power }: MicroAvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  
  const color = useMemo(() => new THREE.Color(EMOTION_COLORS[state]), [state]);
  
  useFrame((frameState, delta) => {
    const t = frameState.clock.elapsedTime;
    
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
    }
    
    if (headRef.current) {
      headRef.current.position.y = 0.2 + Math.sin(t * 2) * 0.02;
    }
    
    if (rightArmRef.current && state === 'patrolling') {
      rightArmRef.current.rotation.z = Math.sin(t * 4) * 0.5 - 0.3;
    }
  });
  
  return (
    <group ref={groupRef} scale={0.8}>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      <pointLight position={[0, 1, 1]} intensity={1.2} color={color} />
      <spotLight position={[-2, 3, 2]} angle={0.3} penumbra={0.5} intensity={0.5} castShadow />
      
      {/* Head */}
      <group ref={headRef} position={[0, 0.2, 0]}>
        {/* Face */}
        <mesh>
          <sphereGeometry args={[0.3, 24, 24, Math.PI * -0.5]} />
          <meshStandardMaterial 
            color="#f5deb3" 
            roughness={0.4} 
            metalness={0.1}
            envMapIntensity={0.5}
          />
        </mesh>
        
        {/* Left Ear */}
        <mesh position={[0.24, 0.27, 0.1]} rotation={[0.15, 0, -0.35]}>
          <coneGeometry args={[0.15, 0.29, 3, 1, false, 1.2]} />
          <meshStandardMaterial 
            color="#cccccc" 
            roughness={0.5}
            metalness={0.05}
          />
        </mesh>
        
        {/* Right Ear */}
        <mesh position={[-0.24, 0.27, 0.1]} rotation={[0.15, 0, 0.35]}>
          <coneGeometry args={[0.15, 0.29, 3, 1, false, 1.2]} />
          <meshStandardMaterial 
            color="#cccccc" 
            roughness={0.5}
            metalness={0.05}
          />
        </mesh>
        
        {/* Eyes */}
        <mesh position={[-0.1, 0.05, 0.25]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        <mesh position={[0.1, 0.05, 0.25]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      </group>
      
      {/* Body */}
      <group position={[0, -0.2, 0]}>
        {/* Top Body */}
        <mesh>
          <cylinderGeometry args={[0.1, 0.2, 0.4, 24, 1, false, Math.PI]} />
          <meshStandardMaterial 
            color="#8b4513" 
            roughness={0.6}
            metalness={0.1}
          />
        </mesh>
        
        {/* Bottom Body */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.2825, 24, 24, 0, Math.PI * 2, 2.36, 0.785]} />
          <meshStandardMaterial 
            color="#493c2b" 
            roughness={0.6}
            metalness={0.1}
          />
        </mesh>
      </group>
      
      {/* Left Arm */}
      <group position={[0.12, -0.13, 0]} rotation={[0, 0, -0.785]}>
        <mesh>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#a46422" roughness={0.8} />
        </mesh>
        <mesh position={[0.05, 0, 0]} rotation={[0, 0, 1.57]}>
          <cylinderGeometry args={[0.05, 0.05, 0.1, 8]} />
          <meshStandardMaterial color="#a46422" roughness={0.8} />
        </mesh>
        <mesh position={[0.1, 0, 0]}>
          <sphereGeometry args={[0.075, 8, 8]} />
          <meshStandardMaterial color="#cccccc" roughness={0.8} />
        </mesh>
      </group>
      
      {/* Right Arm - with wave animation */}
      <group ref={rightArmRef} position={[-0.12, -0.13, 0]} rotation={[0, 0, -3.93]}>
        <mesh>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#a46422" roughness={0.8} />
        </mesh>
        <mesh position={[0.05, 0, 0]} rotation={[0, 0, 1.57]}>
          <cylinderGeometry args={[0.05, 0.05, 0.1, 8]} />
          <meshStandardMaterial color="#a46422" roughness={0.8} />
        </mesh>
        <mesh position={[0.1, 0, 0]}>
          <sphereGeometry args={[0.075, 8, 8]} />
          <meshStandardMaterial color="#cccccc" roughness={0.8} />
        </mesh>
      </group>
      
      {/* Left Leg */}
      <group position={[0.09, -0.46, 0]}>
        <mesh>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#493c2b" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.2, 8]} />
          <meshStandardMaterial color="#493c2b" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.25, 0.01]} rotation={[1.57, 1.57, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.15, 8, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#1b2632" roughness={0.8} />
        </mesh>
      </group>
      
      {/* Right Leg */}
      <group position={[-0.09, -0.46, 0]}>
        <mesh>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#493c2b" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.2, 8]} />
          <meshStandardMaterial color="#493c2b" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.25, 0.01]} rotation={[1.57, 1.57, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.15, 8, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#1b2632" roughness={0.8} />
        </mesh>
      </group>
      
      {/* Glow aura based on state */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={state === 'alerting' ? 0.3 : 0.1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Scan beam power */}
      {power === 'scan' && (
        <mesh position={[0, 0.3, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.05, 2, 8]} />
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
        <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.5, 16]} />
          <meshBasicMaterial
            color="#ff1744"
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
