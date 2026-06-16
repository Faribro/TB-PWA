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

interface NormalAvatarProps {
  state: EntityState;
  power: EntityPower;
}

export default function NormalAvatar({ state, power }: NormalAvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  
  const color = new THREE.Color(EMOTION_COLORS[state]);
  
  useFrame((frameState) => {
    const t = frameState.clock.elapsedTime;
    
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 1.8) * 0.015;
    }
    
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.5) * 0.2;
    }
  });
  
  const pearlMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#0a1628'),
    emissive: color,
    emissiveIntensity: 1.2,
    metalness: 0.3,
    roughness: 0.4,
    transparent: true,
    opacity: 0.88,
  });
  
  return (
    <group ref={groupRef} scale={0.35}>
      <ambientLight intensity={0.1} />
      <pointLight position={[1, 2, 1]} intensity={3} color={color} />
      <pointLight position={[-1, 1, 0.5]} intensity={1.5} color={color} />
      
      {/* Head */}
      <group ref={headRef} position={[0, 1.65, 0]}>
        <mesh material={pearlMat}>
          <sphereGeometry args={[0.13, 24, 24]} />
        </mesh>
        
        {/* Eyes */}
        <mesh position={[-0.052, 0.032, 0.128]}>
          <sphereGeometry args={[0.018, 12, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.052, 0.032, 0.128]}>
          <sphereGeometry args={[0.018, 12, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        
        {/* Iris */}
        <mesh position={[-0.052, 0.032, 0.138]}>
          <sphereGeometry args={[0.010, 12, 12]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh position={[0.052, 0.032, 0.138]}>
          <sphereGeometry args={[0.010, 12, 12]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </group>
      
      {/* Torso */}
      <mesh material={pearlMat} position={[0, 1.31, 0]}>
        <cylinderGeometry args={[0.115, 0.130, 0.22, 14]} />
      </mesh>
      <mesh material={pearlMat} position={[0, 1.12, 0]}>
        <cylinderGeometry args={[0.105, 0.115, 0.18, 14]} />
      </mesh>
      
      {/* Arms - simplified */}
      <mesh material={pearlMat} position={[0.175, 1.27, 0]}>
        <capsuleGeometry args={[0.030, 0.35, 6, 10]} />
      </mesh>
      <mesh material={pearlMat} position={[-0.175, 1.27, 0]}>
        <capsuleGeometry args={[0.030, 0.35, 6, 10]} />
      </mesh>
      
      {/* Aura shell */}
      <mesh position={[0, 1.2, 0]} scale={[1.0, 1.5, 1.0]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          depthWrite={false}
          side={THREE.FrontSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Ground ring */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.24, 0.27, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}
