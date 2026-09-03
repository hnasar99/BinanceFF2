"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Grid,
  Line,
  OrbitControls,
  Sparkles,
  Stars,
} from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  Crosshair,
  Gamepad2,
  MousePointer2,
  Radio,
  ScanLine,
  ShieldCheck,
  Zap,
} from "lucide-react";

type Unit = {
  name: string;
  role: string;
  color: string;
  position: [number, number, number];
};
const units: Unit[] = [
  {
    name: "NEXUS",
    role: "Finds opportunities",
    color: "#36dbe8",
    position: [-4, 0.8, -2.8],
  },
  {
    name: "VECTOR",
    role: "Tests possible routes",
    color: "#956cff",
    position: [4, 0.8, -2.8],
  },
  {
    name: "AEGIS",
    role: "Stops unsafe actions",
    color: "#f3ba2f",
    position: [-4, 0.8, 3],
  },
  {
    name: "ORACLE",
    role: "Checks the result",
    color: "#4de69a",
    position: [4, 0.8, 3],
  },
];

function AgentUnit({
  unit,
  active,
  running,
  onSelect,
}: {
  unit: Unit;
  active: boolean;
  running: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y =
      unit.position[1] +
      Math.sin(clock.elapsedTime * 2 + unit.position[0]) *
        (running ? 0.12 : 0.03);
    ref.current.rotation.y += running ? 0.008 : 0.002;
  });
  return (
    <group
      ref={ref}
      position={unit.position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <pointLight color={unit.color} intensity={active ? 18 : 8} distance={5} />
      <mesh castShadow>
        <icosahedronGeometry args={[0.72, 1]} />
        <meshStandardMaterial
          color={unit.color}
          emissive={unit.color}
          emissiveIntensity={active ? 1.8 : 0.65}
          metalness={0.75}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0, -0.75, 0]}>
        <cylinderGeometry args={[0.34, 0.52, 0.78, 8]} />
        <meshStandardMaterial
          color="#121826"
          metalness={0.8}
          roughness={0.25}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.18, 0]}>
        <ringGeometry args={[0.8, active ? 1.1 : 0.94, 32]} />
        <meshBasicMaterial
          color={unit.color}
          transparent
          opacity={active ? 0.75 : 0.28}
          side={THREE.DoubleSide}
        />
      </mesh>
      {active && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.16, 0]}>
          <ringGeometry args={[1.22, 1.28, 48]} />
          <meshBasicMaterial
            color="#fff"
            transparent
            opacity={0.72}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

function MissionCore({
  progress,
  running,
}: {
  progress: number;
  running: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * (running ? 0.45 : 0.08);
    ref.current.rotation.x = Math.sin(clock.elapsedTime * 0.45) * 0.16;
  });
  return (
    <group position={[0, 1.35, 0]}>
      <pointLight color="#f3ba2f" intensity={22} distance={7} />
      <mesh ref={ref} castShadow>
        <octahedronGeometry args={[1.25, 1]} />
        <meshPhysicalMaterial
          color="#f3ba2f"
          emissive="#8f5e00"
          emissiveIntensity={1.4}
          metalness={0.68}
          roughness={0.12}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.3, 0]}>
        <torusGeometry
          args={[1.55, 0.035, 8, 80, Math.PI * 2 * (progress / 100)]}
        />
        <meshBasicMaterial color="#f3ba2f" toneMapped={false} />
      </mesh>
    </group>
  );
}

function World({
  progress,
  running,
  selected,
  setSelected,
}: {
  progress: number;
  running: boolean;
  selected: number;
  setSelected: (index: number) => void;
}) {
  const beams = useMemo(
    () =>
      units.map((unit) => [
        new THREE.Vector3(0, 1.3, 0),
        new THREE.Vector3(...unit.position),
      ]),
    [],
  );
  return (
    <>
      <color attach="background" args={["#05070d"]} />
      <fog attach="fog" args={["#05070d", 11, 28]} />
      <ambientLight intensity={0.32} />
      <directionalLight
        position={[4, 10, 4]}
        intensity={1.4}
        color="#d6e8ff"
        castShadow
      />
      <Stars
        radius={38}
        depth={22}
        count={900}
        factor={2.3}
        saturation={0.25}
        fade
        speed={0.35}
      />
      <Sparkles
        count={80}
        scale={[13, 5, 13]}
        size={1.4}
        speed={running ? 0.42 : 0.05}
        color="#36dbe8"
      />
      <Grid
        args={[24, 24]}
        position={[0, -0.4, 0]}
        cellSize={0.8}
        cellThickness={0.45}
        cellColor="#1d5160"
        sectionSize={4}
        sectionThickness={0.8}
        sectionColor="#6f52c9"
        fadeDistance={22}
        fadeStrength={1.5}
        infiniteGrid
      />
      <MissionCore progress={progress} running={running} />
      {units.map((unit, index) => (
        <AgentUnit
          key={unit.name}
          unit={unit}
          active={selected === index}
          running={running}
          onSelect={() => setSelected(index)}
        />
      ))}
      {beams.map((points, index) => (
        <Line
          key={index}
          points={points}
          color={units[index].color}
          lineWidth={selected === index ? 2 : 1}
          transparent
          opacity={selected === index ? 0.9 : 0.28}
          dashed
          dashSize={0.18}
          gapSize={0.12}
        />
      ))}
      <Environment preset="night" />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={7}
        maxDistance={17}
        minPolarAngle={0.62}
        maxPolarAngle={1.35}
        autoRotate={running}
        autoRotateSpeed={0.42}
        target={[0, 0.7, 0]}
      />
    </>
  );
}

export function MissionWorld3D({
  progress,
  running,
}: {
  progress: number;
  running: boolean;
}) {
  const [selected, setSelected] = useState(0),
    unit = units[selected];
  return (
    <div className="world3d">
      <Canvas
        dpr={[1, 1.65]}
        camera={{ position: [9, 8, 11], fov: 43 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        shadows
      >
        <World
          progress={progress}
          running={running}
          selected={selected}
          setSelected={setSelected}
        />
      </Canvas>
      <div className="world3d-title">
        <Gamepad2 />
        <div>
          <b>MISSION MAP</b>
          <span>Drag to look around · scroll to zoom · click an agent</span>
        </div>
      </div>
      <div className="world3d-target">
        <Crosshair />
        <span>The shared goal</span>
        <b>{progress}% complete</b>
      </div>
      <div className="unit-inspector">
        <div
          className="unit-glyph"
          style={{ color: unit.color, boxShadow: `0 0 25px ${unit.color}33` }}
        >
          <Zap />
        </div>
        <div>
          <span>AGENT {selected + 1} OF 4</span>
          <h3>{unit.name}</h3>
          <p>{unit.role}</p>
        </div>
        <dl>
          <div>
            <dt>
              <Radio />
              NOW
            </dt>
            <dd>{running ? "WORKING" : "PAUSED"}</dd>
          </div>
          <div>
            <dt>
              <ShieldCheck />
              SAFETY
            </dt>
            <dd>WITHIN LIMITS</dd>
          </div>
          <div>
            <dt>
              <ScanLine />
              TASK
            </dt>
            <dd>{["SEARCH", "TEST", "PROTECT", "CHECK"][selected]}</dd>
          </div>
        </dl>
      </div>
      <div className="world3d-hint">
        <MousePointer2 /> Choose any agent to understand its job
      </div>
    </div>
  );
}
