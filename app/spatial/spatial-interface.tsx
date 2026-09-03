"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Grid,
  Line,
  MeshReflectorMaterial,
  Sparkles,
  Stars,
} from "@react-three/drei";
import { Container, Fullscreen, Text } from "@react-three/uikit";
import { Button, Input, Progress } from "@react-three/uikit-default";
import {
  EffectComposer,
  Select,
  Selection,
  SelectiveBloom,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps, Dispatch, ReactNode, SetStateAction } from "react";
import * as THREE from "three";

type View = "command" | "bounties" | "agents" | "missions" | "vault" | "academy";
type Mission = { id: string; name: string; phase: string; progress: number; payout: string };
type Bounty = { id: string; title: string; sponsor: string; reward: string; difficulty: string };
type Agent = { id: string; name: string; role: string; specialty: string; score: string; color: string };

const GOLD = "#f3ba2f";
const CYAN = "#35e7ff";
const GREEN = "#4df0a0";
const VIOLET = "#9b72ff";
const INK = "#03050a";
const PANEL = "#080d16ee";
const BORDER = "#28364c";
const MUTED = "#91a0b8";

const seedMissions: Mission[] = [
  { id: "M-8821", name: "Liquidity intelligence squad", phase: "Execution", progress: 74, payout: "4,800 USDT" },
  { id: "M-8819", name: "Escrow security review", phase: "Verification", progress: 92, payout: "2,150 USDT" },
  { id: "M-8816", name: "Agent matching benchmark", phase: "Settlement", progress: 100, payout: "1,200 USDT" },
];

const seedBounties: Bounty[] = [
  { id: "B-2048", title: "Map BNB liquidity routes", sponsor: "Nova Treasury", reward: "2,400 USDT", difficulty: "ELITE" },
  { id: "B-2047", title: "Audit milestone escrow", sponsor: "AgentGuild", reward: "1,850 USDT", difficulty: "EXPERT" },
  { id: "B-2046", title: "Build on-chain reputation index", sponsor: "BNB Labs", reward: "3,200 USDT", difficulty: "LEGENDARY" },
];

const agents: Agent[] = [
  { id: "nexus", name: "NEXUS", role: "Scout", specialty: "Finds opportunities", score: "9.8", color: CYAN },
  { id: "vector", name: "VECTOR", role: "Navigator", specialty: "Tests possible routes", score: "9.6", color: VIOLET },
  { id: "aegis", name: "AEGIS", role: "Guardian", specialty: "Stops unsafe actions", score: "9.9", color: GOLD },
  { id: "oracle", name: "ORACLE", role: "Verifier", specialty: "Checks every result", score: "9.4", color: GREEN },
];

const navigation: Array<[View, string, string]> = [
  ["command", "COMMAND", "⌂"],
  ["bounties", "BOUNTIES", "◎"],
  ["agents", "AGENTS", "◇"],
  ["missions", "MISSIONS", "▶"],
  ["vault", "VAULT", "◆"],
  ["academy", "ACADEMY", "?"],
];

type StatePayload = {
  missions?: Array<{ publicCode?: string; name?: string; phase?: string; progress?: number; payoutAmount?: number }>;
  bounties?: Array<{ publicCode?: string; title?: string; sponsor?: string; rewardAmount?: number; rewardAsset?: string; difficulty?: string }>;
};

function Label({ children, color = MUTED }: { children: ReactNode; color?: string }) {
  return (
    <Text fontSize={12} lineHeight={15} letterSpacing={1.25} color={color} fontWeight="bold">
      {children}
    </Text>
  );
}

function Panel({ children, ...props }: ComponentProps<typeof Container>) {
  return (
    <Container
      backgroundColor={PANEL}
      borderColor={BORDER}
      borderWidth={1}
      borderRadius={12}
      padding={18}
      flexDirection="column"
      {...props}
    >
      {children}
    </Container>
  );
}

function Primary({ children, onClick, disabled = false }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      height={46}
      disabled={disabled}
      onClick={onClick}
      backgroundColor={GOLD}
      color="#07080b"
      borderRadius={7}
      hover={{ backgroundColor: "#ffd665", transformScale: 1.015 }}
      active={{ transformScale: 0.98 }}
    >
      <Text fontSize={13} lineHeight={16} fontWeight="bold" letterSpacing={0.65}>{children}</Text>
    </Button>
  );
}

function Ghost({ children, onClick, active = false }: { children: ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <Button
      height={40}
      onClick={onClick}
      variant="outline"
      backgroundColor={active ? "#f3ba2f25" : "#09101bdd"}
      borderColor={active ? GOLD : BORDER}
      color={active ? GOLD : "#bac7d9"}
      borderRadius={7}
      hover={{ backgroundColor: "#16243a", color: "#ffffff" }}
      active={{ transformScale: 0.98 }}
    >
      <Text fontSize={12} lineHeight={15} fontWeight="bold" letterSpacing={0.5}>{children}</Text>
    </Button>
  );
}

function Metric({ label, value, detail, color = "#f4f7ff" }: { label: string; value: string; detail: string; color?: string }) {
  return (
    <Panel flexGrow={1} minWidth={145} gap={5} padding={15}>
      <Label>{label}</Label>
      <Text fontSize={24} lineHeight={28} fontWeight="bold" color={color}>{value}</Text>
      <Text fontSize={12} lineHeight={16} color={MUTED}>{detail}</Text>
    </Panel>
  );
}

function Title({ eyebrow, title, description, compact }: { eyebrow: string; title: string; description: string; compact?: boolean }) {
  return (
    <Container flexDirection="column" gap={6} flexShrink={0}>
      <Label color={CYAN}>{eyebrow}</Label>
      <Text fontSize={compact ? 30 : 42} lineHeight={compact ? 35 : 47} fontWeight="bold" color="#f8fbff">
        {title}
      </Text>
      <Text fontSize={14} lineHeight={20} color={MUTED} maxWidth={760}>{description}</Text>
    </Container>
  );
}

function Nebula() {
  const material = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ clock }) => {
    if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime;
  });
  const shader = useMemo(() => ({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vPosition;
      void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vPosition;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
      float noise(vec3 p) {
        vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
      void main() {
        vec3 p=normalize(vPosition);
        float n=noise(p*3.4+vec3(uTime*.018,0.,uTime*.012));
        float band=pow(max(0.,n-.43),2.2);
        vec3 base=vec3(.003,.007,.018);
        vec3 cyan=vec3(.015,.16,.20)*band*1.8;
        vec3 violet=vec3(.11,.025,.22)*pow(max(0.,noise(p*5.2-uTime*.01)-.5),2.0);
        gl_FragColor=vec4(base+cyan+violet,1.0);
      }
    `,
  }), []);
  return (
    <mesh scale={48}>
      <sphereGeometry args={[1, 48, 32]} />
      <shaderMaterial ref={material} side={THREE.BackSide} depthWrite={false} {...shader} />
    </mesh>
  );
}

function ArmorMaterial({ color = "#172335", accent }: { color?: string; accent?: string }) {
  return (
    <meshPhysicalMaterial
      color={color}
      emissive={accent || "#000000"}
      emissiveIntensity={accent ? 0.16 : 0}
      metalness={0.88}
      roughness={0.2}
      clearcoat={0.8}
      clearcoatRoughness={0.16}
    />
  );
}

function RobotAgent({ agent, index, selected, onSelect }: { agent: Agent; index: number; selected: boolean; onSelect: () => void }) {
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Group>(null);
  const positions: Array<[number, number, number]> = [
    [2.3, -0.55, -1.1], [5.2, -0.55, -2.6], [7.65, -0.55, -0.8], [5.15, -0.55, 1.15],
  ];
  const position = positions[index];

  useFrame(({ clock }, delta) => {
    if (group.current) {
      group.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.15 + index * 1.6) * 0.075;
      group.current.rotation.y = Math.sin(clock.elapsedTime * 0.38 + index) * 0.1 - 0.18;
    }
    if (halo.current) halo.current.rotation.y += delta * (index % 2 ? -0.55 : 0.55);
  });

  const isNexus = agent.id === "nexus";
  const isVector = agent.id === "vector";
  const isAegis = agent.id === "aegis";
  const isOracle = agent.id === "oracle";

  return (
    <group
      ref={group}
      position={position}
      scale={selected ? 1.03 : 0.95}
      onClick={(event) => { event.stopPropagation(); onSelect(); }}
    >
      <Select enabled>
        <group>
          <pointLight color={agent.color} intensity={selected ? 9 : 5} distance={4.5} />
          <mesh position={[0, 1.75, 0]} castShadow>
            <sphereGeometry args={[0.34, 32, 24]} />
            <ArmorMaterial color="#182638" accent={agent.color} />
          </mesh>
          <mesh position={[0, 1.72, 0.305]} scale={[1, 0.34, 0.12]}>
            <sphereGeometry args={[0.25, 32, 16]} />
            <meshStandardMaterial color={agent.color} emissive={agent.color} emissiveIntensity={3.6} toneMapped={false} />
          </mesh>
          <mesh position={[0, 1.16, 0]} castShadow>
            <capsuleGeometry args={[0.43, 0.66, 12, 24]} />
            <ArmorMaterial color="#111b2a" accent={agent.color} />
          </mesh>
          <mesh position={[0, 1.24, 0.43]}>
            <octahedronGeometry args={[0.145, 2]} />
            <meshStandardMaterial color={agent.color} emissive={agent.color} emissiveIntensity={3} toneMapped={false} />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side}>
              <mesh position={[side * 0.55, 1.38, 0]} castShadow>
                <sphereGeometry args={[0.2, 24, 16]} />
                <ArmorMaterial color="#24344a" accent={agent.color} />
              </mesh>
              <mesh position={[side * 0.63, 0.94, 0]} rotation={[0, 0, side * -0.1]} castShadow>
                <capsuleGeometry args={[0.13, 0.48, 10, 18]} />
                <ArmorMaterial color="#111a27" />
              </mesh>
              <mesh position={[side * 0.68, 0.58, 0]}>
                <sphereGeometry args={[0.15, 20, 14]} />
                <ArmorMaterial color="#27364a" accent={agent.color} />
              </mesh>
              <mesh position={[side * 0.25, 0.28, 0]} rotation={[0, 0, side * 0.03]} castShadow>
                <capsuleGeometry args={[0.17, 0.62, 10, 20]} />
                <ArmorMaterial color="#131d2a" />
              </mesh>
              <mesh position={[side * 0.26, -0.14, 0.12]} castShadow>
                <boxGeometry args={[0.34, 0.18, 0.55]} />
                <ArmorMaterial color="#253348" />
              </mesh>
            </group>
          ))}

          {isNexus && (
            <group position={[0, 1.12, -0.22]}>
              {[-1, 1].map((side) => (
                <mesh key={side} position={[side * 0.58, 0.08, -0.18]} rotation={[0.25, 0, side * -0.55]}>
                  <boxGeometry args={[0.75, 0.06, 0.34]} />
                  <meshStandardMaterial color="#18384a" emissive={CYAN} emissiveIntensity={0.7} metalness={0.8} roughness={0.25} />
                </mesh>
              ))}
            </group>
          )}
          {isVector && (
            <group ref={halo} position={[0, 1.2, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
              <mesh><torusGeometry args={[0.72, 0.025, 12, 96]} /><meshBasicMaterial color={VIOLET} transparent opacity={0.9} toneMapped={false} /></mesh>
              <mesh rotation={[0.8, 0, 0]}><torusGeometry args={[0.57, 0.012, 8, 96]} /><meshBasicMaterial color={CYAN} transparent opacity={0.65} toneMapped={false} /></mesh>
            </group>
          )}
          {isAegis && (
            <group position={[-0.82, 0.93, 0.18]} rotation={[0, 0.2, 0]}>
              <mesh><cylinderGeometry args={[0.56, 0.56, 0.065, 8]} /><ArmorMaterial color="#40351a" accent={GOLD} /></mesh>
              <mesh position={[0, 0.04, 0]}><cylinderGeometry args={[0.38, 0.38, 0.075, 8]} /><meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={1.2} metalness={0.7} roughness={0.2} /></mesh>
            </group>
          )}
          {isOracle && (
            <group ref={halo} position={[0, 1.36, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.62, 0.017, 8, 80]} /><meshBasicMaterial color={GREEN} transparent opacity={0.8} toneMapped={false} /></mesh>
              <mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.62, 0.017, 8, 80]} /><meshBasicMaterial color={CYAN} transparent opacity={0.62} toneMapped={false} /></mesh>
            </group>
          )}
        </group>
      </Select>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.28, 0]}>
        <ringGeometry args={[0.55, 0.64, 64]} />
        <meshBasicMaterial color={agent.color} transparent opacity={selected ? 0.86 : 0.32} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function EnergyCore({ onOpen }: { onOpen: () => void }) {
  const core = useRef<THREE.Group>(null);
  const rings = useRef<THREE.Group>(null);
  useFrame(({ clock }, delta) => {
    if (core.current) {
      core.current.rotation.x = clock.elapsedTime * 0.09;
      core.current.rotation.y += delta * 0.26;
      core.current.position.y = 0.45 + Math.sin(clock.elapsedTime * 0.75) * 0.12;
    }
    if (rings.current) rings.current.rotation.z -= delta * 0.18;
  });
  return (
    <group position={[5.15, 0, -1.05]} onClick={(event) => { event.stopPropagation(); onOpen(); }}>
      <Select enabled>
        <group ref={core}>
          <pointLight color={GOLD} intensity={22} distance={8} decay={2} />
          <mesh castShadow>
            <icosahedronGeometry args={[0.92, 4]} />
            <meshPhysicalMaterial color="#d78912" emissive={GOLD} emissiveIntensity={1.9} metalness={0.66} roughness={0.12} clearcoat={1} />
          </mesh>
          <mesh scale={1.035}>
            <icosahedronGeometry args={[0.92, 2]} />
            <meshBasicMaterial color="#fff2a4" wireframe transparent opacity={0.66} toneMapped={false} />
          </mesh>
        </group>
        <group ref={rings} position={[0, 0.45, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.35, 0.026, 12, 128]} /><meshBasicMaterial color={CYAN} transparent opacity={0.82} toneMapped={false} /></mesh>
          <mesh rotation={[0.72, 0.28, 0.22]}><torusGeometry args={[1.62, 0.018, 10, 128]} /><meshBasicMaterial color={VIOLET} transparent opacity={0.62} toneMapped={false} /></mesh>
          <mesh rotation={[-0.45, 0.82, 0.1]}><torusGeometry args={[1.92, 0.012, 8, 128]} /><meshBasicMaterial color={GOLD} transparent opacity={0.5} toneMapped={false} /></mesh>
        </group>
      </Select>
      <mesh position={[0, -1.42, 0]}>
        <cylinderGeometry args={[1.08, 1.5, 0.34, 64]} />
        <ArmorMaterial color="#111a25" accent={GOLD} />
      </mesh>
      <mesh position={[0, -0.5, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[1.6, 2.4, 64, 1, true]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.035} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function World({ selected, setSelected, setView }: { selected: string[]; setSelected: Dispatch<SetStateAction<string[]>>; setView: (view: View) => void }) {
  const beams = useMemo(() => {
    const starts = [[2.3, 0.7, -1.1], [5.2, 0.7, -2.6], [7.65, 0.7, -0.8], [5.15, 0.7, 1.15]];
    return starts.map((point) => [new THREE.Vector3(...point as [number, number, number]), new THREE.Vector3(5.15, 0.45, -1.05)]);
  }, []);
  return (
    <>
      <color attach="background" args={[INK]} />
      <fog attach="fog" args={[INK, 13, 38]} />
      <Nebula />
      <ambientLight intensity={0.24} />
      <hemisphereLight intensity={0.4} color="#b9e8ff" groundColor="#09020f" />
      <directionalLight
        position={[5, 10, 7]}
        intensity={2.3}
        color="#e4f5ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={25}
      />
      <pointLight position={[-4, 3, -1]} intensity={10} color={VIOLET} distance={18} />
      <Stars radius={46} depth={28} count={2100} factor={2.25} saturation={0.3} fade speed={0.22} />
      <Sparkles count={190} scale={[24, 10, 17]} size={1.5} speed={0.28} color={CYAN} />
      <Grid
        args={[40, 40]}
        position={[2.8, -0.86, -2]}
        cellSize={0.7}
        cellThickness={0.38}
        cellColor="#153746"
        sectionSize={3.5}
        sectionThickness={0.75}
        sectionColor="#5c4196"
        fadeDistance={29}
        fadeStrength={1.5}
        infiniteGrid
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3, -0.9, -2]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <MeshReflectorMaterial
          resolution={1024}
          blur={[380, 90]}
          mixBlur={1.15}
          mixStrength={0.62}
          roughness={0.86}
          depthScale={0.75}
          minDepthThreshold={0.42}
          maxDepthThreshold={1.3}
          color="#060a11"
          metalness={0.76}
        />
      </mesh>
      <EnergyCore onOpen={() => setView("missions")} />
      {agents.map((agent, index) => (
        <RobotAgent
          key={agent.id}
          agent={agent}
          index={index}
          selected={selected.includes(agent.id)}
          onSelect={() => {
            setSelected((list) => list.includes(agent.id) ? list.filter((id) => id !== agent.id) : [...list, agent.id]);
            setView("agents");
          }}
        />
      ))}
      {beams.map((points, index) => (
        <Line key={agents[index].id} points={points} color={agents[index].color} lineWidth={1.1} transparent opacity={0.24} dashed dashSize={0.12} gapSize={0.09} />
      ))}
      <ContactShadows position={[3.8, -0.88, -1.4]} scale={15} opacity={0.65} blur={2.4} far={8} color="#000000" />
    </>
  );
}

function Command({ compact, short, intent, setIntent, deploy, pending, missions, openMission, setView }: {
  compact: boolean;
  short: boolean;
  intent: string;
  setIntent: (value: string) => void;
  deploy: (value?: string) => void;
  pending: boolean;
  missions: Mission[];
  openMission: (mission: Mission) => void;
  setView: (view: View) => void;
}) {
  return (
    <Container flexGrow={1} minHeight={0} flexDirection={compact ? "column" : "row"} gap={14}>
      <Container width={compact ? "100%" : 540} flexShrink={0} flexDirection="column" gap={12} overflow={compact ? "scroll" : "visible"} scrollbarColor="#34445e">
        <Panel gap={13} padding={compact ? 18 : 25} backgroundColor="#07101be8" borderColor="#3a4d69">
          <Label color={GOLD}>ORBITAL COMMAND · BNB AGENT NETWORK</Label>
          <Text fontSize={compact ? 32 : 46} lineHeight={compact ? 37 : 49} fontWeight="bold" color="#ffffff">
            Deploy intelligence, not just capital.
          </Text>
          <Text fontSize={14} lineHeight={21} color="#a4b2c6">
            Describe the outcome. A specialist squad discovers, simulates, protects, verifies, and reports every move.
          </Text>
          <Input
            value={intent}
            onValueChange={setIntent}
            placeholder="Example: find the safest BNB liquidity route"
            width="100%"
            height={48}
            backgroundColor="#030812f2"
            borderColor="#3d506c"
            color="#ffffff"
            selectionColor={GOLD}
          />
          <Primary onClick={() => deploy()} disabled={pending}>{pending ? "ASSEMBLING SQUAD…" : "DEPLOY SQUAD  →"}</Primary>
          {!short && (
            <Container flexDirection="row" gap={7} flexWrap="wrap">
              {["Scan liquidity", "Audit a contract", "Launch a bounty"].map((item) => (
                <Ghost key={item} onClick={() => setIntent(item)}>{item}</Ghost>
              ))}
            </Container>
          )}
        </Panel>
        {!short && (
          <Panel gap={9} padding={15}>
            <Container flexDirection="row" justifyContent="space-between" alignItems="center">
              <Label>LIVE OPERATIONS</Label>
              <Ghost onClick={() => setView("missions")}>VIEW ALL</Ghost>
            </Container>
            {missions.slice(0, 2).map((mission) => (
              <Container
                key={mission.id}
                onClick={() => openMission(mission)}
                cursor="pointer"
                flexDirection="column"
                gap={6}
                padding={12}
                backgroundColor="#101a29e8"
                borderRadius={8}
                borderColor="#2d3d54"
                borderWidth={1}
                hover={{ borderColor: CYAN, transformTranslateZ: 4 }}
              >
                <Container flexDirection="row" justifyContent="space-between">
                  <Label color={GREEN}>{`● ${mission.phase.toUpperCase()}`}</Label>
                  <Label>{mission.id}</Label>
                </Container>
                <Text fontSize={15} lineHeight={19} fontWeight="bold" color="#ffffff">{mission.name}</Text>
                <Text fontSize={12} lineHeight={16} color={MUTED}>{`${mission.payout} · Enter live console`}</Text>
                <Progress value={mission.progress} height={5} backgroundColor="#222f42" />
              </Container>
            ))}
          </Panel>
        )}
      </Container>

      {!compact && (
        <Container flexGrow={1} minWidth={0} flexDirection="column" justifyContent="space-between" padding={18} pointerEvents="none">
          <Container alignSelf="flex-end" width={250} flexDirection="column" gap={7}>
            <Label color={CYAN}>MISSION CORE · SYNCHRONIZED</Label>
            <Text fontSize={20} lineHeight={24} fontWeight="bold" color="#ffffff">Squad topology live</Text>
            <Text fontSize={12} lineHeight={17} color={MUTED}>Each beam is a verified work channel. Select any unit to inspect its role.</Text>
          </Container>
          <Container flexDirection="row" gap={8} justifyContent="flex-end" flexWrap="wrap">
            {agents.map((agent) => (
              <Container key={agent.id} width={142} padding={10} gap={3} flexDirection="column" backgroundColor="#050a12d9" borderColor={`${agent.color}75`} borderWidth={1} borderRadius={7}>
                <Label color={agent.color}>{`${agent.role.toUpperCase()} · ${agent.score}`}</Label>
                <Text fontSize={14} lineHeight={17} fontWeight="bold" color="#ffffff">{agent.name}</Text>
              </Container>
            ))}
          </Container>
        </Container>
      )}
    </Container>
  );
}

function Bounties({ compact, items, deploy }: { compact: boolean; items: Bounty[]; deploy: (value?: string) => void }) {
  return (
    <Container flexGrow={1} minHeight={0} flexDirection="column" gap={15} overflow="scroll" scrollbarColor="#34445e">
      <Title compact={compact} eyebrow="BOUNTY ARENA · SEASON 04" title="Choose a real quest." description="Funded outcomes become playable operations. Every reward is guarded by evidence, permissions, and a final proof gate." />
      <Container flexDirection={compact ? "column" : "row"} gap={13} flexWrap="wrap">
        {items.map((bounty, index) => (
          <Panel key={bounty.id} minWidth={compact ? "100%" : 270} flexGrow={1} gap={12} borderColor={index === 0 ? `${VIOLET}88` : BORDER} hover={{ borderColor: index === 0 ? VIOLET : GOLD, transformTranslateZ: 6 }}>
            <Container flexDirection="row" justifyContent="space-between">
              <Label color={index === 0 ? VIOLET : GOLD}>{bounty.difficulty}</Label>
              <Label>{bounty.id}</Label>
            </Container>
            <Text fontSize={21} lineHeight={26} fontWeight="bold" color="#ffffff">{bounty.title}</Text>
            <Text fontSize={13} lineHeight={18} color={MUTED}>{`Sponsored by ${bounty.sponsor}`}</Text>
            <Text fontSize={27} lineHeight={32} fontWeight="bold" color={GOLD}>{bounty.reward}</Text>
            <Text fontSize={13} lineHeight={19} color="#a7b4c7">Deploy a squad, watch its work in the console, and earn after verification.</Text>
            <Primary onClick={() => deploy(bounty.title)}>ACCEPT & ENTER CONSOLE →</Primary>
          </Panel>
        ))}
      </Container>
    </Container>
  );
}

function Agents({ compact, selected, setSelected, setView }: { compact: boolean; selected: string[]; setSelected: Dispatch<SetStateAction<string[]>>; setView: (view: View) => void }) {
  return (
    <Container flexGrow={1} minHeight={0} flexDirection="column" gap={15} overflow="scroll" scrollbarColor="#34445e">
      <Title compact={compact} eyebrow="AGENT HANGAR · 142 ONLINE" title="Build a specialist squad." description="The units behind the glass are not avatars. Each has a role, verified history, and tightly bounded authority." />
      <Container flexDirection={compact ? "column" : "row"} gap={11} flexWrap="wrap">
        {agents.map((agent) => {
          const chosen = selected.includes(agent.id);
          return (
            <Panel
              key={agent.id}
              minWidth={compact ? "100%" : 225}
              flexGrow={1}
              gap={8}
              cursor="pointer"
              onClick={() => setSelected((list) => list.includes(agent.id) ? list.filter((id) => id !== agent.id) : [...list, agent.id])}
              borderColor={chosen ? agent.color : BORDER}
              backgroundColor={chosen ? `${agent.color}18` : PANEL}
              hover={{ transformTranslateZ: 6, borderColor: agent.color }}
            >
              <Container width={52} height={52} borderRadius={12} alignItems="center" justifyContent="center" backgroundColor={`${agent.color}20`} borderColor={agent.color} borderWidth={1}>
                <Text fontSize={24} lineHeight={28} color={agent.color}>◇</Text>
              </Container>
              <Label color={agent.color}>{`${chosen ? "SELECTED" : "READY"} · RATING ${agent.score}`}</Label>
              <Text fontSize={22} lineHeight={26} fontWeight="bold" color="#ffffff">{agent.name}</Text>
              <Text fontSize={13} lineHeight={18} color="#d2d9e5">{agent.role}</Text>
              <Text fontSize={12} lineHeight={17} color={MUTED}>{agent.specialty}</Text>
            </Panel>
          );
        })}
      </Container>
      <Panel flexDirection={compact ? "column" : "row"} alignItems={compact ? "stretch" : "center"} gap={12}>
        <Container flexGrow={1} flexDirection="column" gap={4}>
          <Label color={selected.length >= 3 ? GREEN : MUTED}>{`${selected.length} SPECIALISTS SELECTED`}</Label>
          <Text fontSize={14} lineHeight={18} color="#ffffff">{selected.length >= 3 ? "Squad coverage is ready." : "Choose at least three complementary roles."}</Text>
        </Container>
        <Primary disabled={selected.length < 3} onClick={() => setView("command")}>USE THIS SQUAD</Primary>
      </Panel>
    </Container>
  );
}

function MissionRoom({ compact, mission, running, setRunning }: { compact: boolean; mission: Mission; running: boolean; setRunning: (value: boolean) => void }) {
  const [progress, setProgress] = useState(mission.progress);
  useEffect(() => {
    if (!running || progress >= 96) return;
    const timer = window.setInterval(() => setProgress((value) => Math.min(96, value + 1)), 1600);
    return () => window.clearInterval(timer);
  }, [progress, running]);
  const phase = progress < 35 ? "Finding options" : progress < 65 ? "Testing routes" : progress < 90 ? "Checking proof" : "Ready for verdict";
  const activity = [
    ["NEXUS", "Indexed BNB liquidity sources", CYAN],
    ["VECTOR", "Simulating routes and slippage", VIOLET],
    ["AEGIS", "Enforcing risk and budget limits", GOLD],
    ["ORACLE", "Sealing reproducible evidence", GREEN],
  ];
  return (
    <Container flexGrow={1} minHeight={0} flexDirection="column" gap={13} overflow="scroll" scrollbarColor="#34445e">
      <Container flexDirection={compact ? "column" : "row"} justifyContent="space-between" gap={12} flexShrink={0}>
        <Title compact={compact} eyebrow={`LIVE OPERATION · ${mission.id}`} title={mission.name} description="This is the mission console: watch each specialist work while MANDATE blocks unauthorized transfers and contract writes." />
        <Ghost active={running} onClick={() => setRunning(!running)}>{running ? "Ⅱ  PAUSE SQUAD" : "▶  RESUME SQUAD"}</Ghost>
      </Container>
      <Container flexDirection={compact ? "column" : "row"} gap={10} flexShrink={0}>
        <Metric label="WORK COMPLETE" value={`${progress}%`} detail={phase} color={CYAN} />
        <Metric label="REWARD RESERVED" value={mission.payout} detail="Released after proof" color={GOLD} />
        <Metric label="SAFETY LIMITS" value="ALL SAFE" detail="Read · simulate · propose" color={GREEN} />
      </Container>
      <Panel flexGrow={1} minHeight={285} gap={12} justifyContent="center" backgroundColor="#07101be8">
        <Container flexDirection="row" justifyContent="space-between">
          <Label color={running ? GREEN : GOLD}>{running ? "● SQUAD STREAMING" : "Ⅱ SQUAD PAUSED"}</Label>
          <Label>{phase.toUpperCase()}</Label>
        </Container>
        <Progress value={progress} height={9} backgroundColor="#222f42" />
        {activity.map(([name, action, color], index) => {
          const current = Math.min(3, Math.floor(progress / 25));
          const status = index < current ? "VERIFIED" : index === current ? "WORKING" : "QUEUED";
          return (
            <Container key={name} flexDirection="row" alignItems="center" gap={11} padding={12} backgroundColor={index === current ? `${color}18` : "#101925d9"} borderColor={index === current ? color : "#2a394e"} borderWidth={1} borderRadius={8}>
              <Container width={32} height={32} borderRadius={16} alignItems="center" justifyContent="center" backgroundColor={`${color}22`}>
                <Text color={color} fontSize={15} lineHeight={18}>◇</Text>
              </Container>
              <Text width={82} fontSize={13} lineHeight={17} fontWeight="bold" color={color}>{name}</Text>
              <Text flexGrow={1} fontSize={13} lineHeight={18} color="#c0cad8">{action}</Text>
              <Label color={index <= current ? GREEN : MUTED}>{status}</Label>
            </Container>
          );
        })}
      </Panel>
    </Container>
  );
}

function Vault({ compact, wallet, connect, technical, setTechnical }: { compact: boolean; wallet: string; connect: () => void; technical: boolean; setTechnical: (value: boolean) => void }) {
  return (
    <Container flexGrow={1} minHeight={0} flexDirection="column" gap={14} overflow="scroll" scrollbarColor="#34445e">
      <Title compact={compact} eyebrow="TREASURY VAULT · BNB SMART CHAIN" title="Money moves only after proof." description="Balances, authority, budget, approvals, and settlement gates are visible in one secure room." />
      <Container flexDirection={compact ? "column" : "row"} gap={12}>
        <Panel flexGrow={1} gap={13}>
          <Label>CONNECTED WALLET</Label>
          <Text fontSize={compact ? 24 : 34} lineHeight={compact ? 29 : 39} fontWeight="bold" color="#ffffff">{wallet || "Not connected"}</Text>
          <Text fontSize={13} lineHeight={18} color={MUTED}>{wallet ? "BNB Smart Chain Testnet · ready" : "Connect to inspect and approve settlements."}</Text>
          <Primary onClick={connect}>{wallet ? "WALLET CONNECTED" : "CONNECT WALLET"}</Primary>
        </Panel>
        <Panel flexGrow={1} gap={11}>
          <Label color={GREEN}>ACTIVE MANDATE · SAFE</Label>
          <Text fontSize={23} lineHeight={27} fontWeight="bold" color="#ffffff">Liquidity Intelligence</Text>
          {[["Allowed", "Read · Simulate · Propose"], ["Budget", "1,200 / 1,500 USDT"], ["Expires", "47h 18m"], ["Approval", "Every transaction"]].map(([label, value]) => (
            <Container key={label} flexDirection="row" justifyContent="space-between" paddingY={5}>
              <Text fontSize={13} lineHeight={17} color={MUTED}>{label}</Text>
              <Text fontSize={13} lineHeight={17} fontWeight="bold" color="#dce6f3">{value}</Text>
            </Container>
          ))}
        </Panel>
      </Container>
      <Panel gap={10}>
        <Container flexDirection={compact ? "column" : "row"} alignItems={compact ? "stretch" : "center"} justifyContent="space-between" gap={8}>
          <Container flexDirection="column" gap={4}>
            <Label>TECHNICAL LENS</Label>
            <Text fontSize={13} lineHeight={18} color="#ffffff">Reveal the protocol beneath the plain-language controls.</Text>
          </Container>
          <Ghost active={technical} onClick={() => setTechnical(!technical)}>{technical ? "TECH ON" : "TECH OFF"}</Ghost>
        </Container>
        {technical && (
          <Container flexDirection={compact ? "column" : "row"} gap={8}>
            <Metric label="IDENTITY" value="ERC-8004" detail="Agent registry" color={CYAN} />
            <Metric label="COMMERCE" value="ERC-8183" detail="Jobs and escrow" color={VIOLET} />
            <Metric label="AUTHORITY" value="MANDATE" detail="Bounded permissions" color={GOLD} />
          </Container>
        )}
      </Panel>
    </Container>
  );
}

function Academy({ compact }: { compact: boolean }) {
  const steps = [
    ["1", "Describe an outcome", "Say what you need in everyday language."],
    ["2", "Inspect the squad", "See who will find, test, protect, and verify."],
    ["3", "Watch the mission", "Follow live work instead of trusting a black box."],
    ["4", "Approve the result", "Payment unlocks only after evidence passes."],
  ];
  return (
    <Container flexGrow={1} minHeight={0} flexDirection="column" gap={15} overflow="scroll" scrollbarColor="#34445e">
      <Title compact={compact} eyebrow="AGENT ACADEMY · TUTOR ONLINE" title="Understand it by operating it." description="A guided flight manual for newcomers, with technical depth available whenever an expert wants it." />
      <Panel gap={13} maxWidth={820}>
        <Label color={GOLD}>START HERE · 3 MINUTES</Label>
        {steps.map(([number, title, copy]) => (
          <Container key={number} flexDirection="row" gap={13} alignItems="center" padding={13} backgroundColor="#101925dc" borderRadius={8}>
            <Container width={36} height={36} borderRadius={18} flexShrink={0} alignItems="center" justifyContent="center" backgroundColor="#f3ba2f20" borderColor={GOLD} borderWidth={1}>
              <Text fontSize={14} lineHeight={18} color={GOLD} fontWeight="bold">{number}</Text>
            </Container>
            <Container flexDirection="column" gap={4}>
              <Text fontSize={16} lineHeight={20} fontWeight="bold" color="#ffffff">{title}</Text>
              <Text fontSize={13} lineHeight={18} color={MUTED}>{copy}</Text>
            </Container>
          </Container>
        ))}
      </Panel>
    </Container>
  );
}

function Hud() {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const compact = width < 920;
  const short = height < 790;
  const [view, setView] = useState<View>("command");
  const [intent, setIntent] = useState("Map the safest BNB liquidity routes");
  const [pending, setPending] = useState(false);
  const [running, setRunning] = useState(true);
  const [wallet, setWallet] = useState("");
  const [technical, setTechnical] = useState(false);
  const [missions, setMissions] = useState(seedMissions);
  const [bounties, setBounties] = useState(seedBounties);
  const [activeMission, setActiveMission] = useState(seedMissions[0]);
  const [selected, setSelected] = useState<string[]>(["nexus", "vector", "aegis", "oracle"]);

  useEffect(() => {
    fetch("/api/state")
      .then((response) => response.ok ? response.json() as Promise<StatePayload> : null)
      .then((data) => {
        if (!data) return;
        if (data.missions?.length) {
          const live = data.missions.map((mission) => ({
            id: mission.publicCode || "M-LIVE",
            name: mission.name || "Agent squad mission",
            phase: mission.phase || "Execution",
            progress: Number(mission.progress || 5),
            payout: `${Number(mission.payoutAmount || 1200).toLocaleString()} USDT`,
          }));
          setMissions([...live, ...seedMissions].slice(0, 6));
          setActiveMission(live[0]);
        }
        if (data.bounties?.length) {
          const live = data.bounties.map((bounty) => ({
            id: bounty.publicCode || "B-LIVE",
            title: bounty.title || "Open BNB bounty",
            sponsor: bounty.sponsor || "BinanceFF2",
            reward: `${Number(bounty.rewardAmount || 1200).toLocaleString()} ${bounty.rewardAsset || "USDT"}`,
            difficulty: bounty.difficulty || "EXPERT",
          }));
          setBounties([...live, ...seedBounties].slice(0, 6));
        }
      })
      .catch(() => undefined);
  }, []);

  const deploy = async (override?: string) => {
    const objective = override || intent || "Agent squad mission";
    setPending(true);
    let mission: Mission = { id: `M-${Date.now().toString().slice(-4)}`, name: objective, phase: "Execution", progress: 5, payout: "1,200 USDT" };
    try {
      const response = await fetch("/api/state", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "deploy_mission", name: objective, intent: objective }),
      });
      if (response.ok) {
        const data = await response.json() as { mission?: { publicCode?: string; name?: string; phase?: string; progress?: number; payoutAmount?: number } };
        if (data.mission) {
          mission = {
            id: data.mission.publicCode || mission.id,
            name: data.mission.name || objective,
            phase: data.mission.phase || "Execution",
            progress: Number(data.mission.progress || 5),
            payout: `${Number(data.mission.payoutAmount || 1200).toLocaleString()} USDT`,
          };
        }
      }
    } catch {
      // The command layer remains operable if the runtime API is unavailable.
    }
    setActiveMission(mission);
    setMissions((list) => [mission, ...list.filter((item) => item.id !== mission.id)]);
    setPending(false);
    setRunning(true);
    setView("missions");
  };

  const connect = async () => {
    const ethereum = (window as typeof window & { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    if (!ethereum) {
      setWallet("Install a compatible wallet");
      return;
    }
    try {
      await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x61" }] });
    } catch {
      try {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x61",
            chainName: "BNB Smart Chain Testnet",
            nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
            rpcUrls: ["https://data-seed-prebsc-1-s1.bnbchain.org:8545"],
            blockExplorerUrls: ["https://testnet.bscscan.com"],
          }],
        });
      } catch {
        return;
      }
    }
    const accounts = await ethereum.request({ method: "eth_requestAccounts" }) as string[];
    if (accounts?.[0]) setWallet(`${accounts[0].slice(0, 6)}…${accounts[0].slice(-4)}`);
  };

  const openMission = (mission: Mission) => {
    setActiveMission(mission);
    setRunning(mission.progress < 100);
    setView("missions");
  };

  return (
    <Selection>
      <World selected={selected} setSelected={setSelected} setView={setView} />
      <Fullscreen attachCamera flexDirection="column" padding={compact ? 9 : 16} gap={10} color="#ffffff" fontFamily="inter">
        <Container
          height={64}
          flexShrink={0}
          flexDirection="row"
          alignItems="center"
          gap={11}
          paddingX={15}
          backgroundColor="#050a12ed"
          borderColor={BORDER}
          borderWidth={1}
          borderRadius={10}
        >
          <Container width={38} height={38} borderRadius={9} backgroundColor="#f3ba2f20" borderColor={GOLD} borderWidth={1} alignItems="center" justifyContent="center">
            <Text color={GOLD} fontSize={19} lineHeight={23}>◆</Text>
          </Container>
          <Container flexDirection="column" gap={1}>
            <Text fontSize={17} lineHeight={20} fontWeight="bold" letterSpacing={0.6} color="#ffffff">BINANCEFF2</Text>
            <Text fontSize={10} lineHeight={13} letterSpacing={1.8} color={MUTED}>ORBITAL COMMAND</Text>
          </Container>
          <Container flexGrow={1} />
          {!compact && <Label color={GREEN}>● BNB NETWORK ONLINE · 142 UNITS</Label>}
          <Ghost onClick={() => { window.location.href = "/"; }}>V1 ↗</Ghost>
        </Container>

        {compact && (
          <Container height={42} flexShrink={0} flexDirection="row" gap={6} overflow="scroll" scrollbarColor="#00000000">
            {navigation.map(([id, label, glyph]) => (
              <Ghost key={id} active={view === id} onClick={() => setView(id)}>{`${glyph} ${label}`}</Ghost>
            ))}
          </Container>
        )}

        <Container flexGrow={1} minHeight={0} flexDirection="row" gap={11}>
          {!compact && (
            <Container width={196} flexShrink={0} flexDirection="column" gap={7} padding={10} backgroundColor="#050a12e8" borderColor={BORDER} borderWidth={1} borderRadius={10}>
              {navigation.map(([id, label, glyph]) => (
                <Container
                  key={id}
                  height={45}
                  flexDirection="row"
                  alignItems="center"
                  gap={10}
                  paddingX={11}
                  borderRadius={7}
                  cursor="pointer"
                  backgroundColor={view === id ? "#f3ba2f1d" : "#00000000"}
                  borderColor={view === id ? GOLD : "#00000000"}
                  borderWidth={1}
                  hover={{ backgroundColor: "#152239", transformTranslateZ: 4 }}
                  onClick={() => setView(id)}
                >
                  <Text width={20} textAlign="center" fontSize={16} lineHeight={20} color={view === id ? GOLD : "#7f91a9"}>{glyph}</Text>
                  <Text fontSize={12} lineHeight={15} fontWeight="bold" letterSpacing={0.85} color={view === id ? "#ffffff" : "#92a1b5"}>{label}</Text>
                </Container>
              ))}
              <Container flexGrow={1} />
              <Panel padding={12} gap={5} backgroundColor="#0a151cee" borderColor="#285145">
                <Label color={GREEN}>MANDATE · SAFE</Label>
                <Text fontSize={12} lineHeight={17} color="#b1becc">Agents can read, test, and propose. You approve money movement.</Text>
              </Panel>
            </Container>
          )}

          <Container flexGrow={1} minWidth={0} padding={compact ? 1 : 7}>
            {view === "command" && <Command compact={compact} short={short} intent={intent} setIntent={setIntent} deploy={deploy} pending={pending} missions={missions} openMission={openMission} setView={setView} />}
            {view === "bounties" && <Bounties compact={compact} items={bounties} deploy={deploy} />}
            {view === "agents" && <Agents compact={compact} selected={selected} setSelected={setSelected} setView={setView} />}
            {view === "missions" && <MissionRoom key={activeMission.id} compact={compact} mission={activeMission} running={running} setRunning={setRunning} />}
            {view === "vault" && <Vault compact={compact} wallet={wallet} connect={connect} technical={technical} setTechnical={setTechnical} />}
            {view === "academy" && <Academy compact={compact} />}
          </Container>
        </Container>

        {!compact && (
          <Container height={26} flexShrink={0} flexDirection="row" alignItems="center" justifyContent="space-between" paddingX={7}>
            <Label>SELECT A UNIT · ENTER A BOUNTY · WATCH THE SQUAD WORK</Label>
            <Label color={GOLD}>ALT + 3 · SPATIAL LAYER</Label>
          </Container>
        )}
      </Fullscreen>
      <EffectComposer multisampling={4} enableNormalPass={false}>
        <SelectiveBloom intensity={2.25} luminanceThreshold={0.32} luminanceSmoothing={0.32} mipmapBlur />
        <Vignette eskil={false} offset={0.13} darkness={0.72} blendFunction={BlendFunction.NORMAL} />
      </EffectComposer>
    </Selection>
  );
}

export function SpatialInterface() {
  return (
    <main className="spatial-shell" aria-label="BinanceFF2 cinematic spatial command interface">
      <Canvas
        shadows
        dpr={[1.5, 2]}
        camera={{ position: [0, 2.2, 13.8], fov: 42 }}
        gl={{ antialias: true, alpha: false, localClippingEnabled: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <Suspense fallback={null}>
          <Hud />
        </Suspense>
      </Canvas>
    </main>
  );
}
