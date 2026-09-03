"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Grid, Line, Sparkles, Stars } from "@react-three/drei";
import { Container, Fullscreen, Text } from "@react-three/uikit";
import { Button, Input, Progress } from "@react-three/uikit-default";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps, Dispatch, ReactNode, SetStateAction } from "react";
import * as THREE from "three";

type View = "command" | "bounties" | "agents" | "missions" | "vault" | "academy";
type Mission = { id: string; name: string; phase: string; progress: number; payout: string };
type Bounty = { id: string; title: string; sponsor: string; reward: string; difficulty: string };
type Agent = { id: string; name: string; role: string; score: string; color: string };

const GOLD = "#f3ba2f", CYAN = "#36dbe8", GREEN = "#4de69a", VIOLET = "#956cff";
const INK = "#070910", PANEL = "#0c111de8", BORDER = "#2a3447", MUTED = "#8793a8";
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
  { id: "nexus", name: "NEXUS", role: "Finds opportunities", score: "9.8", color: CYAN },
  { id: "vector", name: "VECTOR", role: "Tests possible routes", score: "9.6", color: VIOLET },
  { id: "aegis", name: "AEGIS", role: "Stops unsafe actions", score: "9.9", color: GOLD },
  { id: "oracle", name: "ORACLE", role: "Checks every result", score: "9.4", color: GREEN },
];
const nav: Array<[View, string, string]> = [
  ["command", "COMMAND", "⌂"], ["bounties", "BOUNTIES", "◎"], ["agents", "AGENTS", "◇"],
  ["missions", "MISSIONS", "▶"], ["vault", "VAULT", "◆"], ["academy", "ACADEMY", "?"],
];
type StatePayload = {
  missions?: Array<{ publicCode?: string; name?: string; phase?: string; progress?: number; payoutAmount?: number }>;
  bounties?: Array<{ publicCode?: string; title?: string; sponsor?: string; rewardAmount?: number; rewardAsset?: string; difficulty?: string }>;
};

function Label({ children, color = MUTED }: { children: ReactNode; color?: string }) {
  return <Text fontSize={10} letterSpacing={1.4} color={color} fontWeight="bold">{children}</Text>;
}
function Panel({ children, ...props }: ComponentProps<typeof Container>) {
  return <Container backgroundColor={PANEL} borderColor={BORDER} borderWidth={1} borderRadius={12} padding={16} flexDirection="column" {...props}>{children}</Container>;
}
function Primary({ children, onClick, disabled = false }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <Button height={42} disabled={disabled} onClick={onClick} backgroundColor={GOLD} color="#090a0d" borderRadius={7}
      hover={{ backgroundColor: "#ffcf59", transformScale: 1.02 }} active={{ transformScale: 0.98 }}>
      <Text fontSize={12} fontWeight="bold" letterSpacing={0.7}>{children}</Text>
    </Button>
  );
}
function Ghost({ children, onClick, active = false }: { children: ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <Button height={38} onClick={onClick} variant="outline" backgroundColor={active ? "#f3ba2f24" : "#0b1019dd"}
      borderColor={active ? GOLD : BORDER} color={active ? GOLD : "#b8c2d2"} borderRadius={7}
      hover={{ backgroundColor: "#182132", color: "#ffffff" }} active={{ transformScale: 0.98 }}>
      <Text fontSize={11} fontWeight="bold" letterSpacing={0.5}>{children}</Text>
    </Button>
  );
}
function Metric({ label, value, detail, color = "#f4f7ff" }: { label: string; value: string; detail: string; color?: string }) {
  return <Panel flexGrow={1} minWidth={130} gap={4}><Label>{label}</Label><Text fontSize={22} fontWeight="bold" color={color}>{value}</Text><Text fontSize={10} color={MUTED}>{detail}</Text></Panel>;
}
function Title({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <Container flexDirection="column" gap={4}><Label color={CYAN}>{eyebrow}</Label><Text fontSize={30} fontWeight="bold" color="#f7f9ff">{title}</Text><Text fontSize={12} lineHeight={18} color={MUTED} maxWidth={720}>{description}</Text></Container>;
}

function MissionCore({ onOpen }: { onOpen: () => void }) {
  const core = useRef<THREE.Mesh>(null), ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (core.current) { core.current.rotation.x = clock.elapsedTime * .18; core.current.rotation.y = clock.elapsedTime * .58; core.current.position.y = Math.sin(clock.elapsedTime * 1.2) * .12; }
    if (ring.current) ring.current.rotation.z = -clock.elapsedTime * .35;
  });
  return (
    <group position={[2.6, .1, -1.8]} onClick={(event) => { event.stopPropagation(); onOpen(); }}>
      <pointLight color={GOLD} intensity={24} distance={8} />
      <mesh ref={core}><octahedronGeometry args={[1.05, 1]} /><meshPhysicalMaterial color={GOLD} emissive="#8a5900" emissiveIntensity={1.5} metalness={.72} roughness={.16} /></mesh>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.55, .035, 10, 96]} /><meshBasicMaterial color={CYAN} transparent opacity={.8} toneMapped={false} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.85, .018, 8, 96]} /><meshBasicMaterial color={VIOLET} transparent opacity={.5} toneMapped={false} /></mesh>
    </group>
  );
}
function AgentDrone({ agent, index, selected, onSelect }: { agent: Agent; index: number; selected: boolean; onSelect: () => void }) {
  const group = useRef<THREE.Group>(null), angle = index / agents.length * Math.PI * 2 + .35;
  const position: [number, number, number] = [2.6 + Math.cos(angle) * 3.1, -.2, -1.8 + Math.sin(angle) * 2.1];
  useFrame(({ clock }) => { if (group.current) { group.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.7 + index) * .12; group.current.rotation.y += .009; } });
  return (
    <group ref={group} position={position} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
      <pointLight color={agent.color} intensity={selected ? 14 : 7} distance={4} />
      <mesh><icosahedronGeometry args={[selected ? .54 : .43, 1]} /><meshStandardMaterial color={agent.color} emissive={agent.color} emissiveIntensity={selected ? 1.3 : .5} metalness={.78} roughness={.2} /></mesh>
      <mesh position={[0, -.55, 0]}><cylinderGeometry args={[.22, .34, .5, 7]} /><meshStandardMaterial color="#111827" metalness={.8} roughness={.26} /></mesh>
    </group>
  );
}
function World({ selected, setSelected, setView }: { selected: string[]; setSelected: Dispatch<SetStateAction<string[]>>; setView: (view: View) => void }) {
  const beams = useMemo(() => agents.map((_, index) => { const angle = index / agents.length * Math.PI * 2 + .35; return [new THREE.Vector3(2.6, .1, -1.8), new THREE.Vector3(2.6 + Math.cos(angle) * 3.1, -.2, -1.8 + Math.sin(angle) * 2.1)]; }), []);
  return <><color attach="background" args={[INK]} /><fog attach="fog" args={[INK, 10, 32]} /><ambientLight intensity={.35} /><directionalLight position={[5, 8, 6]} intensity={1.4} color="#d7e7ff" />
    <Stars radius={42} depth={24} count={950} factor={2.2} saturation={.25} fade speed={.25} /><Sparkles count={70} scale={[18, 7, 12]} size={1.5} speed={.35} color={CYAN} />
    <Grid args={[28, 28]} position={[0, -2.1, -3]} cellSize={.7} cellThickness={.35} cellColor="#16434e" sectionSize={3.5} sectionThickness={.7} sectionColor="#5d47a8" fadeDistance={23} fadeStrength={1.7} infiniteGrid />
    <MissionCore onOpen={() => setView("missions")} />
    {agents.map((agent, index) => <AgentDrone key={agent.id} agent={agent} index={index} selected={selected.includes(agent.id)} onSelect={() => { setSelected((list) => list.includes(agent.id) ? list.filter((id) => id !== agent.id) : [...list, agent.id]); setView("agents"); }} />)}
    {beams.map((points, index) => <Line key={agents[index].id} points={points} color={agents[index].color} lineWidth={1} transparent opacity={.28} dashed dashSize={.16} gapSize={.1} />)}
  </>;
}

function Command({ compact, intent, setIntent, deploy, pending, missions, bounties, openMission, setView }: { compact: boolean; intent: string; setIntent: (v: string) => void; deploy: (v?: string) => void; pending: boolean; missions: Mission[]; bounties: Bounty[]; openMission: (m: Mission) => void; setView: (v: View) => void }) {
  return (
    <Container flexGrow={1} flexDirection="column" gap={12} overflow="scroll" scrollbarColor="#3b475c">
      <Panel minHeight={compact ? 220 : 245} padding={compact ? 15 : 22} gap={12} justifyContent="center" backgroundColor="#0b101bd9" borderColor="#39435a">
        <Label color={GOLD}>SPATIAL COMMAND · BNB AGENT NETWORK</Label>
        <Text fontSize={compact ? 26 : 40} fontWeight="bold" lineHeight={compact ? 30 : 43} color="#ffffff" maxWidth={720}>Tell the network what outcome you need.</Text>
        <Text fontSize={12} lineHeight={18} color="#9aa5b8" maxWidth={650}>BinanceFF2 assembles specialists, limits what they may do, verifies the result, and only then unlocks payment.</Text>
        <Container flexDirection={compact ? "column" : "row"} gap={8} width="100%">
          <Input value={intent} onValueChange={setIntent} placeholder="Example: find the safest BNB liquidity route" flexGrow={1} height={44} backgroundColor="#070b13ee" borderColor="#38445a" color="#ffffff" selectionColor={GOLD} />
          <Primary onClick={() => deploy()} disabled={pending}>{pending ? "ASSEMBLING SQUAD…" : "DEPLOY SQUAD  →"}</Primary>
        </Container>
        <Container flexDirection="row" gap={7} flexWrap="wrap">{["Scan liquidity", "Audit a contract", "Launch a bounty"].map((item) => <Ghost key={item} onClick={() => setIntent(item)}>{item}</Ghost>)}</Container>
      </Panel>
      {!compact && <Container flexDirection="row" gap={10}><Metric label="AGENTS ONLINE" value="142" detail="Ready to assemble" color={CYAN} /><Metric label="VERIFIED MISSIONS" value="12,847" detail="98.2% completed" /><Metric label="ACTIVE BOUNTIES" value={String(Math.max(284, bounties.length))} detail="31 close today" color={GOLD} /><Metric label="AGENT PAYOUTS" value="$846K" detail="Last 30 days" color={GREEN} /></Container>}
      <Container flexDirection={compact ? "column" : "row"} gap={10}>
        <Panel flexGrow={1} gap={9}><Container flexDirection="row" justifyContent="space-between" alignItems="center"><Label>LIVE OPERATIONS</Label><Ghost onClick={() => setView("missions")}>ALL MISSIONS</Ghost></Container>
          {missions.slice(0, compact ? 1 : 2).map((mission) => <Container key={mission.id} onClick={() => openMission(mission)} cursor="pointer" flexDirection="column" gap={6} padding={11} backgroundColor="#121a28e8" borderRadius={8} borderColor="#2b374a" borderWidth={1} hover={{ borderColor: CYAN, transformTranslateZ: 4 }}><Container flexDirection="row" justifyContent="space-between"><Label color={GREEN}>● {mission.phase.toUpperCase()}</Label><Label>{mission.id}</Label></Container><Text fontSize={15} fontWeight="bold" color="#ffffff">{mission.name}</Text><Text fontSize={10} color={MUTED}>{mission.payout} · Open to watch the squad</Text><Progress value={mission.progress} height={5} backgroundColor="#222c3b" /></Container>)}
        </Panel>
        <Panel flexGrow={1} gap={9}><Container flexDirection="row" justifyContent="space-between" alignItems="center"><Label>BOUNTY SIGNAL</Label><Ghost onClick={() => setView("bounties")}>ENTER ARENA</Ghost></Container>
          {bounties.slice(0, compact ? 1 : 2).map((bounty) => <Container key={bounty.id} flexDirection="row" alignItems="center" gap={10} padding={11} backgroundColor="#121724e8" borderRadius={8}><Container width={34} height={34} borderRadius={17} alignItems="center" justifyContent="center" backgroundColor="#f3ba2f20" borderColor={GOLD} borderWidth={1}><Text color={GOLD} fontSize={16}>◎</Text></Container><Container flexGrow={1} flexDirection="column" gap={3}><Text fontSize={13} fontWeight="bold" color="#ffffff">{bounty.title}</Text><Text fontSize={10} color={MUTED}>{bounty.sponsor} · {bounty.difficulty}</Text></Container><Text fontSize={12} fontWeight="bold" color={GOLD}>{bounty.reward}</Text></Container>)}
        </Panel>
      </Container>
    </Container>
  );
}

function Bounties({ compact, items, deploy }: { compact: boolean; items: Bounty[]; deploy: (v?: string) => void }) {
  return <Container flexGrow={1} flexDirection="column" gap={12} overflow="scroll" scrollbarColor="#3b475c"><Title eyebrow="BOUNTY ARENA · SEASON 04" title="Choose a quest." description="Every bounty is a real outcome with a funded reward and a measurable proof gate." /><Container flexDirection={compact ? "column" : "row"} gap={12} flexWrap="wrap">{items.map((bounty, index) => <Panel key={bounty.id} minWidth={compact ? "100%" : 245} flexGrow={1} gap={10} hover={{ borderColor: index === 0 ? VIOLET : GOLD, transformTranslateZ: 5 }}><Container flexDirection="row" justifyContent="space-between"><Label color={index === 0 ? VIOLET : GOLD}>{bounty.difficulty}</Label><Label>{bounty.id}</Label></Container><Text fontSize={18} fontWeight="bold" lineHeight={22} color="#ffffff">{bounty.title}</Text><Text fontSize={11} color={MUTED}>Sponsored by {bounty.sponsor}</Text><Text fontSize={23} fontWeight="bold" color={GOLD}>{bounty.reward}</Text><Text fontSize={10} lineHeight={15} color="#9aa5b8">Deliver evidence, pass the risk gate, and earn the verifier verdict.</Text><Primary onClick={() => deploy(bounty.title)}>ACCEPT & DEPLOY  →</Primary></Panel>)}</Container></Container>;
}

function Agents({ compact, selected, setSelected, setView }: { compact: boolean; selected: string[]; setSelected: Dispatch<SetStateAction<string[]>>; setView: (v: View) => void }) {
  return <Container flexGrow={1} flexDirection="column" gap={12} overflow="scroll" scrollbarColor="#3b475c"><Title eyebrow="AGENT HANGAR · 142 ONLINE" title="Build your squad." description="Select specialists. Verified history, role and safety boundaries travel with them into every mission." /><Container flexDirection={compact ? "column" : "row"} gap={10} flexWrap="wrap">{agents.map((agent) => { const chosen = selected.includes(agent.id); return <Panel key={agent.id} minWidth={compact ? "100%" : 210} flexGrow={1} gap={9} cursor="pointer" onClick={() => setSelected((list) => list.includes(agent.id) ? list.filter((id) => id !== agent.id) : [...list, agent.id])} borderColor={chosen ? agent.color : BORDER} backgroundColor={chosen ? `${agent.color}18` : PANEL} hover={{ transformTranslateZ: 5, borderColor: agent.color }}><Container width={48} height={48} borderRadius={12} alignItems="center" justifyContent="center" backgroundColor={`${agent.color}20`} borderColor={agent.color} borderWidth={1}><Text fontSize={21} color={agent.color}>◇</Text></Container><Label color={agent.color}>{chosen ? "SELECTED" : "READY"} · RATING {agent.score}</Label><Text fontSize={20} fontWeight="bold" color="#ffffff">{agent.name}</Text><Text fontSize={11} color={MUTED}>{agent.role}</Text></Panel>; })}</Container><Panel flexDirection={compact ? "column" : "row"} alignItems={compact ? "stretch" : "center"} gap={10}><Container flexGrow={1} flexDirection="column" gap={3}><Label color={selected.length >= 3 ? GREEN : MUTED}>{selected.length} SPECIALISTS SELECTED</Label><Text fontSize={13} color="#ffffff">{selected.length >= 3 ? "Squad coverage is ready." : "Choose at least three roles."}</Text></Container><Primary disabled={selected.length < 3} onClick={() => setView("command")}>USE THIS SQUAD</Primary></Panel></Container>;
}

function MissionRoom({ compact, mission, running, setRunning }: { compact: boolean; mission: Mission; running: boolean; setRunning: (v: boolean) => void }) {
  const [progress, setProgress] = useState(mission.progress);
  useEffect(() => { if (!running || progress >= 96) return; const timer = window.setInterval(() => setProgress((v) => Math.min(96, v + 1)), 1600); return () => window.clearInterval(timer); }, [progress, running]);
  const phase = progress < 35 ? "Finding options" : progress < 65 ? "Testing routes" : progress < 90 ? "Checking proof" : "Ready for verdict";
  const activity = [["NEXUS", "Indexed BNB liquidity sources", CYAN], ["VECTOR", "Simulating routes and slippage", VIOLET], ["AEGIS", "Enforcing risk and budget limits", GOLD], ["ORACLE", "Sealing reproducible evidence", GREEN]];
  return <Container flexGrow={1} flexDirection="column" gap={12} overflow="scroll" scrollbarColor="#3b475c"><Container flexDirection={compact ? "column" : "row"} justifyContent="space-between" gap={10}><Title eyebrow={`LIVE OPERATION · ${mission.id}`} title={mission.name} description="Watch each specialist work. The mandate prevents transfers or contract writes until you approve." /><Ghost active={running} onClick={() => setRunning(!running)}>{running ? "Ⅱ  PAUSE SQUAD" : "▶  RESUME SQUAD"}</Ghost></Container><Container flexDirection={compact ? "column" : "row"} gap={10}><Metric label="WORK COMPLETE" value={`${progress}%`} detail={phase} color={CYAN} /><Metric label="REWARD RESERVED" value={mission.payout} detail="Released after proof" color={GOLD} /><Metric label="SAFETY LIMITS" value="ALL SAFE" detail="Read · simulate · propose" color={GREEN} /></Container><Panel flexGrow={1} gap={13} minHeight={245} justifyContent="center"><Container flexDirection="row" justifyContent="space-between"><Label color={running ? GREEN : GOLD}>{running ? "● SQUAD STREAMING" : "Ⅱ SQUAD PAUSED"}</Label><Label>{phase.toUpperCase()}</Label></Container><Progress value={progress} height={9} backgroundColor="#222c3b" />{activity.map(([name, action, color], index) => <Container key={name} flexDirection="row" alignItems="center" gap={10} padding={10} backgroundColor={index === Math.min(3, Math.floor(progress / 25)) ? `${color}18` : "#111824cc"} borderColor={index === Math.min(3, Math.floor(progress / 25)) ? color : "#263144"} borderWidth={1} borderRadius={8}><Container width={28} height={28} borderRadius={14} alignItems="center" justifyContent="center" backgroundColor={`${color}22`}><Text color={color} fontSize={13}>◇</Text></Container><Text width={74} fontSize={11} fontWeight="bold" color={color}>{name}</Text><Text flexGrow={1} fontSize={11} color="#b4bdcc">{action}</Text><Label color={index <= Math.floor(progress / 25) ? GREEN : MUTED}>{index < Math.floor(progress / 25) ? "VERIFIED" : index === Math.floor(progress / 25) ? "WORKING" : "QUEUED"}</Label></Container>)}</Panel></Container>;
}

function Vault({ compact, wallet, connect, technical, setTechnical }: { compact: boolean; wallet: string; connect: () => void; technical: boolean; setTechnical: (v: boolean) => void }) {
  return <Container flexGrow={1} flexDirection="column" gap={12} overflow="scroll" scrollbarColor="#3b475c"><Title eyebrow="TREASURY VAULT · BNB SMART CHAIN" title="Money moves only after proof." description="See balances, active authority and settlement gates in one spatial control room." /><Container flexDirection={compact ? "column" : "row"} gap={12}><Panel flexGrow={1} gap={12}><Label>CONNECTED WALLET</Label><Text fontSize={compact ? 20 : 28} fontWeight="bold" color="#ffffff">{wallet || "Not connected"}</Text><Text fontSize={12} color={MUTED}>{wallet ? "BNB Smart Chain Testnet · ready" : "Connect to inspect and approve settlements."}</Text><Primary onClick={connect}>{wallet ? "WALLET CONNECTED" : "CONNECT WALLET"}</Primary></Panel><Panel flexGrow={1} gap={10}><Label color={GREEN}>ACTIVE MANDATE · SAFE</Label><Text fontSize={20} fontWeight="bold" color="#ffffff">Liquidity Intelligence</Text>{[["Allowed", "Read · Simulate · Propose"], ["Budget", "1,200 / 1,500 USDT"], ["Expires", "47h 18m"], ["Approval", "Every transaction"]].map(([label, value]) => <Container key={label} flexDirection="row" justifyContent="space-between" paddingY={4}><Text fontSize={11} color={MUTED}>{label}</Text><Text fontSize={11} fontWeight="bold" color="#dce2ed">{value}</Text></Container>)}</Panel></Container><Panel gap={9}><Container flexDirection="row" alignItems="center" justifyContent="space-between"><Container flexDirection="column" gap={3}><Label>TECHNICAL LENS</Label><Text fontSize={12} color="#ffffff">Reveal the protocol below the plain-language controls</Text></Container><Ghost active={technical} onClick={() => setTechnical(!technical)}>{technical ? "TECH ON" : "TECH OFF"}</Ghost></Container>{technical && <Container flexDirection={compact ? "column" : "row"} gap={8}><Metric label="IDENTITY" value="ERC-8004" detail="Agent registry" color={CYAN} /><Metric label="COMMERCE" value="ERC-8183" detail="Jobs and escrow" color={VIOLET} /><Metric label="AUTHORITY" value="MANDATE" detail="Bounded permissions" color={GOLD} /></Container>}</Panel></Container>;
}

function Academy() {
  const steps = [["1", "Describe an outcome", "Say what you need in everyday language."], ["2", "Inspect the squad", "See who will find, test, protect and verify."], ["3", "Watch the mission", "Follow live work instead of trusting a black box."], ["4", "Approve the result", "Payment unlocks only after evidence passes."]];
  return <Container flexGrow={1} flexDirection="column" gap={12} overflow="scroll" scrollbarColor="#3b475c"><Title eyebrow="AGENT ACADEMY · TUTOR ONLINE" title="Understand it by operating it." description="The interface translates the agent economy for newcomers while keeping technical depth one click away." /><Panel gap={13} maxWidth={780}><Label color={GOLD}>START HERE · 3 MINUTES</Label>{steps.map(([number, title, copy]) => <Container key={number} flexDirection="row" gap={12} alignItems="center" padding={11} backgroundColor="#111824dd" borderRadius={8}><Container width={32} height={32} borderRadius={16} alignItems="center" justifyContent="center" backgroundColor="#f3ba2f20" borderColor={GOLD} borderWidth={1}><Text fontSize={13} color={GOLD} fontWeight="bold">{number}</Text></Container><Container flexDirection="column" gap={3}><Text fontSize={14} fontWeight="bold" color="#ffffff">{title}</Text><Text fontSize={11} color={MUTED}>{copy}</Text></Container></Container>)}</Panel></Container>;
}

function Hud() {
  const compact = useThree((state) => state.size.width < 860);
  const [view, setView] = useState<View>("command"), [intent, setIntent] = useState("Map the safest BNB liquidity routes");
  const [pending, setPending] = useState(false), [running, setRunning] = useState(true), [wallet, setWallet] = useState(""), [technical, setTechnical] = useState(false);
  const [missions, setMissions] = useState(seedMissions), [bounties, setBounties] = useState(seedBounties), [activeMission, setActiveMission] = useState(seedMissions[0]);
  const [selected, setSelected] = useState<string[]>(["nexus", "vector", "aegis", "oracle"]);
  useEffect(() => { fetch("/api/state").then((r) => r.ok ? r.json() as Promise<StatePayload> : null).then((data) => { if (!data) return; if (data.missions?.length) { const live = data.missions.map((m) => ({ id: m.publicCode || "M-LIVE", name: m.name || "Agent squad mission", phase: m.phase || "Execution", progress: Number(m.progress || 5), payout: `${Number(m.payoutAmount || 1200).toLocaleString()} USDT` })); setMissions([...live, ...seedMissions].slice(0, 6)); setActiveMission(live[0]); } if (data.bounties?.length) setBounties([...data.bounties.map((b) => ({ id: b.publicCode || "B-LIVE", title: b.title || "Open BNB bounty", sponsor: b.sponsor || "BinanceFF2", reward: `${Number(b.rewardAmount || 1200).toLocaleString()} ${b.rewardAsset || "USDT"}`, difficulty: b.difficulty || "EXPERT" })), ...seedBounties].slice(0, 6)); }).catch(() => undefined); }, []);
  const deploy = async (override?: string) => { const objective = override || intent || "Agent squad mission"; setPending(true); let mission: Mission = { id: `M-${Date.now().toString().slice(-4)}`, name: objective, phase: "Execution", progress: 5, payout: "1,200 USDT" }; try { const response = await fetch("/api/state", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "deploy_mission", name: objective, intent: objective }) }); if (response.ok) { const data = await response.json() as { mission?: { publicCode?: string; name?: string; phase?: string; progress?: number; payoutAmount?: number } }; if (data.mission) mission = { id: data.mission.publicCode || mission.id, name: data.mission.name || objective, phase: data.mission.phase || "Execution", progress: Number(data.mission.progress || 5), payout: `${Number(data.mission.payoutAmount || 1200).toLocaleString()} USDT` }; } } catch { /* Keep the spatial layer operable offline. */ } setActiveMission(mission); setMissions((list) => [mission, ...list.filter((item) => item.id !== mission.id)]); setPending(false); setRunning(true); setView("missions"); };
  const connect = async () => { const ethereum = (window as typeof window & { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum; if (!ethereum) { setWallet("Install a compatible wallet"); return; } try { await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x61" }] }); } catch { try { await ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: "0x61", chainName: "BNB Smart Chain Testnet", nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 }, rpcUrls: ["https://data-seed-prebsc-1-s1.bnbchain.org:8545"], blockExplorerUrls: ["https://testnet.bscscan.com"] }] }); } catch { return; } } const accounts = await ethereum.request({ method: "eth_requestAccounts" }) as string[]; if (accounts?.[0]) setWallet(`${accounts[0].slice(0, 6)}…${accounts[0].slice(-4)}`); };
  const openMission = (m: Mission) => { setActiveMission(m); setRunning(m.progress < 100); setView("missions"); };
  return <><World selected={selected} setSelected={setSelected} setView={setView} /><Fullscreen attachCamera flexDirection="column" padding={compact ? 9 : 15} gap={10} color="#ffffff" fontFamily="inter">
    <Container height={54} flexShrink={0} flexDirection="row" alignItems="center" gap={10} paddingX={13} backgroundColor="#090d16e8" borderColor={BORDER} borderWidth={1} borderRadius={10}><Container width={34} height={34} borderRadius={8} backgroundColor="#f3ba2f1f" borderColor={GOLD} borderWidth={1} alignItems="center" justifyContent="center"><Text color={GOLD} fontSize={17}>◆</Text></Container><Container flexDirection="column"><Text fontSize={15} fontWeight="bold" letterSpacing={.5} color="#ffffff">BINANCEFF2</Text><Text fontSize={8} letterSpacing={1.8} color={MUTED}>SPATIAL COMMAND</Text></Container><Container flexGrow={1} />{!compact && <Label color={GREEN}>● BNB NETWORK ONLINE</Label>}<Ghost onClick={() => { window.location.href = "/"; }}>V1 ↗</Ghost></Container>
    {compact && <Container height={42} flexShrink={0} flexDirection="row" gap={6} overflow="scroll" scrollbarColor="#00000000">{nav.map(([id, label, glyph]) => <Ghost key={id} active={view === id} onClick={() => setView(id)}>{glyph} {label}</Ghost>)}</Container>}
    <Container flexGrow={1} flexDirection="row" gap={10} minHeight={0}>{!compact && <Container width={174} flexShrink={0} flexDirection="column" gap={7} padding={9} backgroundColor="#080c14e8" borderColor={BORDER} borderWidth={1} borderRadius={10}>{nav.map(([id, label, glyph]) => <Container key={id} height={42} flexDirection="row" alignItems="center" gap={10} paddingX={11} borderRadius={7} cursor="pointer" backgroundColor={view === id ? "#f3ba2f1d" : "#00000000"} borderColor={view === id ? GOLD : "#00000000"} borderWidth={1} hover={{ backgroundColor: "#172032", transformTranslateZ: 4 }} onClick={() => setView(id)}><Text width={18} textAlign="center" fontSize={14} color={view === id ? GOLD : "#7d8ba1"}>{glyph}</Text><Text fontSize={10} fontWeight="bold" letterSpacing={.9} color={view === id ? "#ffffff" : "#8996aa"}>{label}</Text></Container>)}<Container flexGrow={1} /><Panel padding={11} gap={4} backgroundColor="#0d151eee"><Label color={GREEN}>MANDATE SAFE</Label><Text fontSize={10} lineHeight={15} color="#aab4c5">Agents can read, test and propose. You approve money movement.</Text></Panel></Container>}
      <Container flexGrow={1} minWidth={0} padding={compact ? 2 : 6}>{view === "command" && <Command compact={compact} intent={intent} setIntent={setIntent} deploy={deploy} pending={pending} missions={missions} bounties={bounties} openMission={openMission} setView={setView} />}{view === "bounties" && <Bounties compact={compact} items={bounties} deploy={deploy} />}{view === "agents" && <Agents compact={compact} selected={selected} setSelected={setSelected} setView={setView} />}{view === "missions" && <MissionRoom key={activeMission.id} compact={compact} mission={activeMission} running={running} setRunning={setRunning} />}{view === "vault" && <Vault compact={compact} wallet={wallet} connect={connect} technical={technical} setTechnical={setTechnical} />}{view === "academy" && <Academy />}</Container>
    </Container>{!compact && <Container height={25} flexShrink={0} flexDirection="row" alignItems="center" justifyContent="space-between" paddingX={6}><Label>CLICK PANELS · AGENT DRONES · MISSION CORE</Label><Label color={GOLD}>ALT + 3 · SPATIAL LAYER</Label></Container>}
  </Fullscreen></>;
}

export function SpatialInterface() {
  return <main className="spatial-shell" aria-label="BinanceFF2 spatial command interface"><Canvas dpr={[1, 1.75]} camera={{ position: [0, 1, 11], fov: 46 }} gl={{ antialias: true, alpha: false, localClippingEnabled: true }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}><Suspense fallback={null}><Hud /></Suspense></Canvas></main>;
}
