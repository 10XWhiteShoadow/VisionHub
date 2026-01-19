import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import { useScroll, useTransform, motion, MotionValue } from 'framer-motion';
import * as THREE from 'three';

interface ScrollContextProps {
  scrollYProgress: MotionValue<number>;
}

// Eye-shaped mesh representing computer vision
function VisionEye({ scrollYProgress, position, scale = 1 }: ScrollContextProps & { position: [number, number, number]; scale?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();
  
  useFrame((state) => {
    if (meshRef.current) {
      const scroll = scrollYProgress.get();
      meshRef.current.rotation.x = scroll * Math.PI * 2 + state.clock.elapsedTime * 0.1;
      meshRef.current.rotation.y = scroll * Math.PI + state.clock.elapsedTime * 0.15;
      meshRef.current.position.z = Math.sin(scroll * Math.PI * 2) * 2;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={meshRef} position={position} scale={scale}>
        <torusGeometry args={[1, 0.4, 16, 100]} />
        <MeshDistortMaterial
          color="#00d4ff"
          transparent
          opacity={0.6}
          distort={0.3}
          speed={2}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
    </Float>
  );
}

// Neural network node
function NeuralNode({ scrollYProgress, position, delay = 0 }: ScrollContextProps & { position: [number, number, number]; delay?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      const scroll = scrollYProgress.get();
      const time = state.clock.elapsedTime + delay;
      meshRef.current.position.y = position[1] + Math.sin(time * 0.5 + scroll * 10) * 0.5;
      meshRef.current.scale.setScalar(0.8 + Math.sin(time * 2) * 0.2);
      meshRef.current.rotation.x = time * 0.3;
      meshRef.current.rotation.z = time * 0.2;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <icosahedronGeometry args={[0.3, 1]} />
      <meshStandardMaterial
        color="#a855f7"
        emissive="#a855f7"
        emissiveIntensity={0.5}
        transparent
        opacity={0.8}
        wireframe
      />
    </mesh>
  );
}

// Scanning grid plane
function ScanningGrid({ scrollYProgress }: ScrollContextProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  
  useFrame(() => {
    if (meshRef.current && materialRef.current) {
      const scroll = scrollYProgress.get();
      meshRef.current.rotation.x = -Math.PI / 2 + scroll * 0.5;
      meshRef.current.position.y = -5 + scroll * 3;
      materialRef.current.opacity = 0.1 + scroll * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, -5, -10]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[50, 50, 50, 50]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#00d4ff"
        transparent
        opacity={0.1}
        wireframe
      />
    </mesh>
  );
}

// Data stream particles
function DataParticles({ scrollYProgress }: ScrollContextProps) {
  const pointsRef = useRef<THREE.Points>(null);
  
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      const scroll = scrollYProgress.get();
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.05 + scroll * Math.PI;
      pointsRef.current.rotation.x = scroll * 0.5;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={500}
          array={particlesPosition}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#00d4ff"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// Rotating cube frame (detection box)
function DetectionBox({ scrollYProgress, position }: ScrollContextProps & { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      const scroll = scrollYProgress.get();
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2 + scroll * Math.PI;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3 + scroll * Math.PI * 0.5;
      meshRef.current.scale.setScalar(1 + scroll * 0.5);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[2, 2, 2]} />
      <meshBasicMaterial
        color="#f472b6"
        transparent
        opacity={0.3}
        wireframe
      />
    </mesh>
  );
}

// Main scene content
function Scene({ scrollYProgress }: ScrollContextProps) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#00d4ff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#a855f7" />
      
      {/* Vision eyes */}
      <VisionEye scrollYProgress={scrollYProgress} position={[-4, 2, -5]} scale={0.8} />
      <VisionEye scrollYProgress={scrollYProgress} position={[4, -1, -8]} scale={1.2} />
      <VisionEye scrollYProgress={scrollYProgress} position={[0, 3, -12]} scale={0.6} />
      
      {/* Neural network nodes */}
      <NeuralNode scrollYProgress={scrollYProgress} position={[-3, 0, -6]} delay={0} />
      <NeuralNode scrollYProgress={scrollYProgress} position={[2, 2, -4]} delay={1} />
      <NeuralNode scrollYProgress={scrollYProgress} position={[5, -2, -7]} delay={2} />
      <NeuralNode scrollYProgress={scrollYProgress} position={[-2, -3, -5]} delay={3} />
      <NeuralNode scrollYProgress={scrollYProgress} position={[0, 1, -9]} delay={4} />
      
      {/* Detection boxes */}
      <DetectionBox scrollYProgress={scrollYProgress} position={[-6, -2, -10]} />
      <DetectionBox scrollYProgress={scrollYProgress} position={[6, 3, -12]} />
      
      {/* Scanning grid */}
      <ScanningGrid scrollYProgress={scrollYProgress} />
      
      {/* Data particles */}
      <DataParticles scrollYProgress={scrollYProgress} />
    </>
  );
}

export function VisionScene3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ height: '100vh' }}
    >
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <Scene scrollYProgress={scrollYProgress} />
      </Canvas>
    </div>
  );
}

export default VisionScene3D;
