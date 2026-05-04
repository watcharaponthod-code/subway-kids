"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Sky, Stars, Text, Float } from "@react-three/drei";
import { GameEngine3D } from "@/lib/gameEngine3D";
import * as THREE from "three";
// Using the correct import path for JSM examples in Three.js
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

function Character({ x, y, status }: { x: number, y: number, status: string }) {
  const fbx = useLoader(FBXLoader, "/models/character.fbx");
  const group = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  // Memoize the model instance using SkeletonUtils for proper skinned mesh cloning
  const model = useMemo(() => {
    // SkeletonUtils.clone is required for skinned meshes to animate correctly after cloning
    const clone = SkeletonUtils.clone(fbx) as THREE.Group;
    clone.scale.set(0.002, 0.002, 0.002); 
    clone.rotation.y = Math.PI; 
    
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Debug skinned mesh
        if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
          console.log("%c SkinnedMesh found:", "color: orange;", mesh.name);
        }

        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach(m => {
            if ('emissive' in m) {
              (m as any).emissive = new THREE.Color(0x333333);
              (m as any).emissiveIntensity = 0.4;
            }
          });
        }
      }
    });
    return clone;
  }, [fbx]);

  // Setup animations once
  useEffect(() => {
    if (fbx.animations && fbx.animations.length > 0) {
      console.log("%c ANIMATIONS DETECTED:", "color: green; font-weight: bold;", fbx.animations.map(a => a.name));
      
      const mixer = new THREE.AnimationMixer(model);
      mixerRef.current = mixer;
      
      // Look for run/walk/mixamo.com animations
      const runClip = fbx.animations.find(a => 
        a.name.toLowerCase().includes('run') || 
        a.name.toLowerCase().includes('walk') ||
        a.name.toLowerCase().includes('mixamo')
      ) || fbx.animations[0];

      console.log("%c PLAYING CLIP ON MODEL:", "color: blue; font-weight: bold;", runClip.name);
      const action = mixer.clipAction(runClip);
      action.reset().fadeIn(0.5).play();

      return () => {
        mixer.stopAllAction();
        mixerRef.current = null;
      };
    } else {
      console.error("%c NO ANIMATIONS FOUND IN FBX!", "color: red; font-weight: bold;");
    }
  }, [fbx, model]);

  useFrame((state, delta) => {
    // Crucial: Mixer MUST be updated every frame with delta
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
    
    if (group.current) {
      group.current.position.x = x;
      group.current.position.y = y;
      group.current.rotation.z = -x * 0.05;
    }
  });

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  );
}

function Obstacle({ x, y, z, id }: { x: number, y: number, z: number, id: number }) {
  // Use ID to determine type
  const isCrate = id % 2 === 0;
  
  return (
    <mesh position={[x, y, z]}>
      {isCrate ? (
        <boxGeometry args={[1.5, 1.5, 1.5]} />
      ) : (
        <cylinderGeometry args={[0.7, 0.7, 1.8, 16]} />
      )}
      <meshStandardMaterial 
        color={isCrate ? "#e67e22" : "#34495e"} 
        roughness={0.7}
        metalness={0.2}
        emissive={isCrate ? "#d35400" : "#2c3e50"}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}

function Building({ position, scale, color }: { position: [number, number, number], scale: [number, number, number], color: string }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={scale} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.2} />
      </mesh>
      {/* Neon Windows */}
      {[...Array(5)].map((_, i) => (
        <mesh key={i} position={[scale[0] / 2 * (position[0] > 0 ? -1.01 : 1.01), (i * 2) - scale[1] / 4, 0]}>
          <planeGeometry args={[scale[0] * 0.5, 0.5]} />
          <meshStandardMaterial 
            emissive={i % 2 === 0 ? "#00f2ff" : "#ff00d4"} 
            emissiveIntensity={2} 
            color={i % 2 === 0 ? "#00f2ff" : "#ff00d4"}
          />
        </mesh>
      ))}
    </group>
  );
}

function Environment() {
  const ref = useRef<THREE.Group>(null);
  
  // Create a lot of buildings
  const buildings = useMemo(() => {
    return [...Array(20)].map((_, i) => ({
      id: i,
      position: [(i % 2 === 0 ? 8 : -8) + (Math.random() * 2), 5, -i * 10] as [number, number, number],
      scale: [4, 15 + Math.random() * 20, 4] as [number, number, number],
      color: i % 3 === 0 ? "#1a1a2e" : (i % 3 === 1 ? "#16213e" : "#0f3460")
    }));
  }, []);

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.position.z += 15 * delta;
      if (ref.current.position.z > 20) ref.current.position.z = -80;
    }
  });

  return (
    <group ref={ref}>
      {buildings.map(b => (
        <Building key={b.id} {...b} />
      ))}
    </group>
  );
}

function Road() {
  const roadRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (roadRef.current) {
      roadRef.current.position.z = (state.clock.elapsedTime * 15) % 10;
    }
  });

  return (
    <group ref={roadRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, -100]}>
        <planeGeometry args={[12, 300]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.1} metalness={0.8} />
      </mesh>
      {/* Side Neon Rails */}
      {[-5.5, 5.5].map(x => (
        <mesh key={x} position={[x, 0.1, -100]}>
          <boxGeometry args={[0.2, 0.1, 300]} />
          <meshStandardMaterial emissive="#00f2ff" emissiveIntensity={1.5} color="#00f2ff" />
        </mesh>
      ))}
      {/* Lane Markers */}
      {[-1.5, 1.5].map(x => (
        <group key={x}>
          {[...Array(30)].map((_, i) => (
            <mesh key={i} position={[x, 0.05, -i * 10]}>
              <boxGeometry args={[0.1, 0.01, 3]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export default function SceneContent({ engine }: { engine: GameEngine3D }) {
  const [playerX, setPlayerX] = useState(0);
  const [playerY, setPlayerY] = useState(0);
  const [obstacles, setObstacles] = useState<any[]>([]);

  useFrame(() => {
    engine.update();
    setPlayerX(engine.playerX);
    setPlayerY(engine.playerY);
    setObstacles([...engine.obstacles]);
  });

  return (
    <>
      <color attach="background" args={["#87ceeb"]} />
      <fog attach="fog" args={["#87ceeb", 20, 100]} />
      
      <ambientLight intensity={1.5} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={2.5} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
      />
      
      <Sky sunPosition={[100, 20, 100]} />
      
      <Road />
      <Environment />
      <Character x={playerX} y={playerY} status={engine.status} />
      
      {obstacles.map((obs) => (
        <Obstacle key={obs.id} id={obs.id} x={obs.position.x} y={obs.position.y} z={obs.position.z} />
      ))}

      {engine.status === "over" && (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          <Text
            position={[0, 4, -5]}
            fontSize={1.2}
            color="#e67e22"
            anchorX="center"
            anchorY="middle"
          >
            GAME OVER
          </Text>
        </Float>
      )}
    </>
  );
}
