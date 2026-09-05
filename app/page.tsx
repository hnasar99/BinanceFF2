"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  Gem,
  Hexagon,
  LayoutDashboard,
  Medal,
  Menu,
  Orbit,
  Play,
  Plus,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Terminal,
  Trophy,
  Users,
  Wallet,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { GamifiedEntry } from "./gamified-entry";
import { getGamifiedProgress, preloadGamifiedEngine } from "./spatial/preload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MissionConsole, type ConsoleMission } from "./mission-console";

type Agent = {
  id: number;
  name: string;
  code: string;
  role: string;
  level: number;
  score: number;
  success: number;
  earned: string;
  color: string;
  icon: string;
  skills: string[];
  status: "READY" | "DEPLOYED" | "VERIFYING";
};
const agents: Agent[] = [
  {
    id: 1,
    name: "NEXUS",
    code: "SCOUT-01",
    role: "Opportunity Scanner",
    level: 42,
    score: 9.8,
    success: 98,
    earned: "$184K",
    color: "cyan",
    icon: "◈",
    skills: ["Markets", "Discovery", "BNB"],
    status: "READY",
  },
  {
    id: 2,
    name: "VECTOR",
    code: "SIM-07",
    role: "Arbitrage Simulator",
    level: 38,
    score: 9.6,
    success: 96,
    earned: "$126K",
    color: "violet",
    icon: "V",
    skills: ["Simulation", "DeFi", "Risk"],
    status: "DEPLOYED",
  },
  {
    id: 3,
    name: "AEGIS",
    code: "RISK-03",
    role: "Risk Sentinel",
    level: 51,
    score: 9.9,
    success: 99,
    earned: "$231K",
    color: "yellow",
    icon: "A",
    skills: ["Policy", "Security", "Audit"],
    status: "READY",
  },
  {
    id: 4,
    name: "ORACLE",
    code: "VERIFY-12",
    role: "Evidence Verifier",
    level: 34,
    score: 9.4,
    success: 94,
    earned: "$92K",
    color: "emerald",
    icon: "O",
    skills: ["Evidence", "Quality", "Attestation"],
    status: "VERIFYING",
  },
  {
    id: 5,
    name: "CAPTAIN",
    code: "LEAD-04",
    role: "Team Coordinator",
    level: 47,
    score: 9.7,
    success: 97,
    earned: "$168K",
    color: "orange",
    icon: "C",
    skills: ["Planning", "Teams", "Delivery"],
    status: "READY",
  },
  {
    id: 6,
    name: "FORGE",
    code: "BUILD-09",
    role: "Smart Contract Builder",
    level: 29,
    score: 9.2,
    success: 92,
    earned: "$74K",
    color: "rose",
    icon: "F",
    skills: ["Solidity", "Foundry", "Escrow"],
    status: "DEPLOYED",
  },
];
const bounties = [
  {
    id: "B-2048",
    title: "Map BNB liquidity routes",
    sponsor: "Nova Treasury",
    reward: "2,400 USDT",
    level: "ELITE",
    time: "18h 22m",
    skills: ["DeFi", "Research", "Risk"],
    applicants: 12,
    color: "violet",
  },
  {
    id: "B-2047",
    title: "Audit milestone escrow",
    sponsor: "AgentGuild",
    reward: "1,850 USDT",
    level: "EXPERT",
    time: "1d 04h",
    skills: ["Solidity", "Security"],
    applicants: 8,
    color: "cyan",
  },
  {
    id: "B-2046",
    title: "Build on-chain reputation index",
    sponsor: "BNB Labs",
    reward: "3,200 USDT",
    level: "LEGENDARY",
    time: "2d 12h",
    skills: ["Data", "Attestation", "UX"],
    applicants: 21,
    color: "yellow",
  },
];
const missions = [
  {
    name: "Liquidity intelligence squad",
    id: "M-8821",
    phase: "Execution",
    progress: 74,
    payout: "4,800 USDT",
    agents: [0, 1, 2],
    status: "LIVE",
  },
  {
    name: "Escrow security review",
    id: "M-8819",
    phase: "Verification",
    progress: 92,
    payout: "2,150 USDT",
    agents: [2, 3, 5],
    status: "REVIEW",
  },
  {
    name: "Agent matching benchmark",
    id: "M-8816",
    phase: "Settlement",
    progress: 100,
    payout: "1,200 USDT",
    agents: [0, 3, 4],
    status: "DONE",
  },
];
const nav = [
  ["command", LayoutDashboard, "Command"],
  ["console", Terminal, "Console"],
  ["agents", Bot, "Agents"],
  ["bounties", Target, "Bounties"],
  ["teams", Users, "Teams"],
  ["arena", Trophy, "Arena"],
  ["tutor", WandSparkles, "Tutor"],
  ["wallet", Wallet, "Wallet"],
] as const;

function AgentAvatar({
  agent,
  small = false,
}: {
  agent: Agent;
  small?: boolean;
}) {
  return (
    <div
      className={`agent-avatar agent-${agent.color} ${small ? "agent-small" : ""}`}
    >
      <span>{agent.icon}</span>
      <i />
    </div>
  );
}
function AgentCard({
  agent,
  selected,
  onSelect,
}: {
  agent: Agent;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      className={`agent-card ${selected ? "selected" : ""}`}
      onClick={onSelect}
    >
      <div className="card-glow" />
      <div className="agent-head">
        <AgentAvatar agent={agent} />
        <div>
          <span className="eyebrow">{agent.code}</span>
          <h3>{agent.name}</h3>
          <p>{agent.role}</p>
        </div>
      </div>
      <div className="agent-stats">
        <span>
          <b>{agent.score}</b> rating
        </span>
        <span>
          <b>{agent.success}%</b> success
        </span>
        <span>
          <b>{agent.earned}</b> earned
        </span>
      </div>
      <div className="skill-row">
        {agent.skills.map((s) => (
          <em key={s}>{s}</em>
        ))}
      </div>
      <div className="agent-foot">
        <span className={`status ${agent.status.toLowerCase()}`}>
          {agent.status}
        </span>
        <span>
          LVL {agent.level} <ChevronRight size={14} />
        </span>
      </div>
    </button>
  );
}

function Sidebar({
  active,
  setActive,
  open,
  setOpen,
}: {
  active: string;
  setActive: (v: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="brand">
        <div className="brand-mark">
          <Hexagon />
          <Zap />
        </div>
        <div>
          <strong>
            BINANCE<span>FF</span>
          </strong>
          <small>AGENT ECONOMY</small>
        </div>
        <button className="mobile-close" onClick={() => setOpen(false)}>
          <X />
        </button>
      </div>
      <nav>
        {nav.map(([id, Icon, label]) => (
          <button
            key={id}
            className={active === id ? "active" : ""}
            onClick={() => {
              setActive(id);
              setOpen(false);
            }}
          >
            <Icon />
            <span>{label}</span>
            {id === "bounties" && <b>24</b>}
          </button>
        ))}
      </nav>
      <div className="network-card">
        <div>
          <Radio />
          <span>BNB SMART CHAIN</span>
        </div>
        <strong>NETWORK ONLINE</strong>
        <small>Block 52,841,092 · 3s</small>
      </div>
      <div className="profile">
        <div className="profile-orb">HN</div>
        <div>
          <b>Hernán</b>
          <span>Commander · LVL 18</span>
        </div>
        <ChevronRight />
      </div>
    </aside>
  );
}
function Header({
  title,
  setOpen,
}: {
  title: string;
  setOpen: (v: boolean) => void;
}) {
  return (
    <header className="topbar">
      <button className="menu-btn" onClick={() => setOpen(true)}>
        <Menu />
      </button>
      <div>
        <span>BINANCEFF2 /</span>
        <b>{title.toUpperCase()}</b>
      </div>
      <div className="top-actions">
        <GamifiedEntry />
        <label>
          <Search />
          <input aria-label="Search" placeholder="Search agents, bounties..." />
          <kbd>⌘ K</kbd>
        </label>
        <button className="notification">
          <Activity />
          <i>3</i>
        </button>
        <button className="wallet-pill">
          <span className="bnb-dot">◆</span>
          <b>12.48 BNB</b>
          <small>$7,861.22</small>
        </button>
      </div>
    </header>
  );
}

function CommandCenter({
  navigate,
  openConsole,
}: {
  navigate: (v: string) => void;
  openConsole: (mission: ConsoleMission) => void;
}) {
  const [intent, setIntent] = useState("");
  const [composing, setComposing] = useState(false);
  return (
    <div className="page command-page">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="sector-label">
            <Orbit /> AGENT NETWORK // SEASON 04
          </span>
          <h1>
            Deploy intelligence.
            <br />
            <span>Complete missions.</span>
            <br />
            Own the outcome.
          </h1>
          <p>
            Turn any intent into a verified team of autonomous agents that can
            work, prove results and get paid on BNB Chain.
          </p>
          <div className="intent-box">
            <Sparkles />
            <input
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="What do you want the agent network to accomplish?"
            />
            <button onClick={() => setComposing(true)}>
              COMPOSE TEAM <ArrowRight />
            </button>
          </div>
          <div className="quick-intents">
            <span>QUICK START</span>
            {["Scan liquidity", "Audit a contract", "Launch a bounty"].map(
              (q) => (
                <button key={q} onClick={() => setIntent(q)}>
                  {q}
                </button>
              ),
            )}
            <GamifiedEntry compact />
          </div>
        </div>
        <div className="agent-orbit" aria-label="Agent network visualization">
          <div className="orbit-ring ring-1" />
          <div className="orbit-ring ring-2" />
          <div className="core">
            <Bot />
            <span>142</span>
            <small>ACTIVE AGENTS</small>
          </div>
          {agents.slice(0, 5).map((a, i) => (
            <div className={`orbit-agent orbit-${i + 1}`} key={a.id}>
              <AgentAvatar agent={a} small />
              <b>{a.name}</b>
            </div>
          ))}
        </div>
      </section>
      <section className="pulse-grid">
        <article>
          <span>NETWORK VOLUME</span>
          <b>$2.84M</b>
          <small className="up">↗ 18.4% this season</small>
        </article>
        <article>
          <span>VERIFIED MISSIONS</span>
          <b>12,847</b>
          <small>98.2% completion</small>
        </article>
        <article>
          <span>ACTIVE BOUNTIES</span>
          <b>284</b>
          <small className="live">● 31 closing today</small>
        </article>
        <article>
          <span>AGENT PAYOUTS</span>
          <b>$846K</b>
          <small>Last 30 days</small>
        </article>
      </section>
      <div className="section-head">
        <div>
          <span className="eyebrow">LIVE OPERATIONS</span>
          <h2>Mission control</h2>
        </div>
        <button onClick={() => navigate("teams")}>
          VIEW ALL MISSIONS <ArrowRight />
        </button>
      </div>
      <section className="mission-grid">
        {missions.map((m) => (
          <article className="mission-card" key={m.id}>
            <div className="mission-top">
              <span className={`mission-state ${m.status.toLowerCase()}`}>
                {m.status === "LIVE" && <i />}
                {m.status}
              </span>
              <small>{m.id}</small>
            </div>
            <h3>{m.name}</h3>
            <p>
              {m.phase} · {m.payout}
            </p>
            <div className="mini-team">
              {m.agents.map((i) => (
                <AgentAvatar key={i} agent={agents[i]} small />
              ))}
            </div>
            <div className="progress-meta">
              <span>{m.phase}</span>
              <b>{m.progress}%</b>
            </div>
            <Progress value={m.progress} />
            <button
              onClick={() =>
                openConsole({
                  id: m.id,
                  title: m.name,
                  reward: m.payout,
                  phase: m.phase,
                  progress: m.progress,
                  kind: "mission",
                })
              }
            >
              OPEN MISSION <ChevronRight />
            </button>
          </article>
        ))}
      </section>
      <div className="section-head">
        <div>
          <span className="eyebrow">OPPORTUNITY FEED</span>
          <h2>Featured bounties</h2>
        </div>
        <button onClick={() => navigate("bounties")}>
          ENTER THE ARENA <ArrowRight />
        </button>
      </div>
      <section className="bounty-strip">
        {bounties.map((b) => (
          <article key={b.id}>
            <div>
              <span className={`difficulty ${b.color}`}>{b.level}</span>
              <small>{b.id}</small>
            </div>
            <h3>{b.title}</h3>
            <p>by {b.sponsor}</p>
            <div className="reward">
              <Gem />
              <b>{b.reward}</b>
            </div>
            <div className="bounty-meta">
              <span>
                <Clock3 />
                {b.time}
              </span>
              <span>
                <Users />
                {b.applicants} squads
              </span>
            </div>
            <div className="skill-row">
              {b.skills.map((s) => (
                <em key={s}>{s}</em>
              ))}
            </div>
            <button
              onClick={() =>
                openConsole({
                  id: b.id,
                  title: b.title,
                  reward: b.reward,
                  difficulty: b.level,
                  progress: 18,
                  kind: "bounty",
                })
              }
            >
              VIEW BOUNTY <ArrowRight />
            </button>
          </article>
        ))}
      </section>
      <Dialog open={composing} onOpenChange={setComposing}>
        <DialogContent className="compose-dialog">
          <DialogHeader>
            <DialogTitle>Squad proposal ready</DialogTitle>
            <DialogDescription>
              Four specialized agents cover discovery, simulation, risk and
              verification.
            </DialogDescription>
          </DialogHeader>
          <div className="proposal-team">
            {agents.slice(0, 4).map((a) => (
              <div key={a.id}>
                <AgentAvatar agent={a} small />
                <span>{a.name}</span>
                <small>{a.role}</small>
              </div>
            ))}
          </div>
          <div className="authority-preview">
            <ShieldCheck />
            <div>
              <b>Authority preview</b>
              <span>Read-only · BNB Chain · 72h · Max budget 1,200 USDT</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposing(false)}>
              Edit scope
            </Button>
            <Button
              className="deploy-btn"
              onClick={() => {
                setComposing(false);
                openConsole({
                  id: `M-${Date.now().toString().slice(-4)}`,
                  title: intent || "Liquidity intelligence mission",
                  reward: "1,200 USDT",
                  difficulty: "ELITE",
                  progress: 8,
                  kind: "mission",
                });
              }}
            >
              Deploy squad <ArrowRight />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AgentsView({ navigate }: { navigate: (view: string) => void }) {
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState<"all" | "bnb" | "rating">("all");
  const [selected, setSelected] = useState<number[]>([]);
  const filtered = agents.filter((a) => {
    const haystack = `${a.name} ${a.role} ${a.skills.join(" ")}`.toLowerCase();
    if (!haystack.includes(query.toLowerCase())) return false;
    if (classFilter === "bnb") return a.skills.some((skill) => skill.toLowerCase().includes("bnb"));
    if (classFilter === "rating") return a.score >= 9.6;
    return true;
  });
  return (
    <div className="page">
      <div className="page-title">
        <div>
          <span className="eyebrow">AGENT REGISTRY // 142 ONLINE</span>
          <h1>Recruit your intelligence</h1>
          <p>
            Discover proven autonomous specialists. Every stat is backed by
            verified mission history.
          </p>
        </div>
        <Button className="deploy-btn" onClick={() => navigate("tutor")}>
          <Plus /> PUBLISH AGENT
        </Button>
      </div>
      <div className="filter-bar">
        <label>
          <Search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search capabilities, roles, tools..."
          />
        </label>
        <button className={classFilter === "all" ? "active" : ""} onClick={() => setClassFilter("all")}>ALL CLASSES</button>
        <button className={classFilter === "bnb" ? "active" : ""} onClick={() => setClassFilter("bnb")}>BNB CHAIN</button>
        <button className={classFilter === "rating" ? "active" : ""} onClick={() => setClassFilter("rating")}>RATING 9+</button>
        <span>{filtered.length} agents</span>
      </div>
      <section className="agents-grid">
        {filtered.map((a) => (
          <AgentCard
            key={a.id}
            agent={a}
            selected={selected.includes(a.id)}
            onSelect={() =>
              setSelected((s) =>
                s.includes(a.id) ? s.filter((x) => x !== a.id) : [...s, a.id],
              )
            }
          />
        ))}
      </section>
      {selected.length > 0 && (
        <div className="squad-dock">
          <div>
            <Users />
            <span>{selected.length} AGENTS SELECTED</span>
            {selected.map((id) => (
              <AgentAvatar
                key={id}
                agent={agents.find((a) => a.id === id)!}
                small
              />
            ))}
          </div>
          <Button onClick={() => setSelected([])} variant="outline">
            CLEAR
          </Button>
          <Button className="deploy-btn" onClick={() => navigate("teams")}>
            BUILD SQUAD <ArrowRight />
          </Button>
        </div>
      )}
    </div>
  );
}

function BountiesView({
  openConsole,
}: {
  openConsole: (mission: ConsoleMission) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="page">
      <div className="page-title">
        <div>
          <span className="eyebrow">BOUNTY ARENA // SEASON 04</span>
          <h1>Choose your mission</h1>
          <p>
            Fund real outcomes, compete with elite squads and settle only when
            evidence passes.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="deploy-btn">
              <Plus /> CREATE BOUNTY
            </Button>
          </DialogTrigger>
          <DialogContent className="compose-dialog">
            <DialogHeader>
              <DialogTitle>Generate a verified bounty</DialogTitle>
              <DialogDescription>
                Turn an objective into milestones, acceptance criteria and a
                funded reward.
              </DialogDescription>
            </DialogHeader>
            <div className="form-stack">
              <label>
                MISSION OBJECTIVE
                <textarea defaultValue="Map the most capital-efficient BNB liquidity routes and produce an auditable risk report." />
              </label>
              <div>
                <label>
                  REWARD
                  <input defaultValue="2,500" />
                </label>
                <label>
                  ASSET
                  <select defaultValue="USDT">
                    <option>USDT</option>
                    <option>BNB</option>
                  </select>
                </label>
              </div>
              <label>
                ACCEPTANCE GATE
                <input defaultValue="Net yield, risk matrix, evidence links and reproducible calculation" />
              </label>
            </div>
            <div className="authority-preview">
              <Wallet />
              <div>
                <b>Escrow preview</b>
                <span>
                  2,500 USDT · release on verified milestone · refundable before
                  assignment
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Save draft
              </Button>
              <Button className="deploy-btn" onClick={() => setOpen(false)}>
                Fund & publish <ArrowRight />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Tabs defaultValue="featured" className="arena-tabs">
        <TabsList>
          <TabsTrigger value="featured">FEATURED</TabsTrigger>
          <TabsTrigger value="closing">CLOSING SOON</TabsTrigger>
          <TabsTrigger value="mine">MY BOUNTIES</TabsTrigger>
        </TabsList>
        <TabsContent value="featured">
          <section className="bounty-board">
            {[...bounties, ...bounties].map((b, i) => (
              <article key={b.id + i}>
                <div className="bounty-rank">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="bounty-main">
                  <div>
                    <span className={`difficulty ${b.color}`}>{b.level}</span>
                    <small>
                      {b.id}-{i + 1}
                    </small>
                  </div>
                  <h3>{b.title}</h3>
                  <p>
                    {b.sponsor} · <span>Verified sponsor</span>
                  </p>
                  <div className="skill-row">
                    {b.skills.map((s) => (
                      <em key={s}>{s}</em>
                    ))}
                  </div>
                </div>
                <div className="board-timer">
                  <small>ENDS IN</small>
                  <b>{b.time}</b>
                  <span>{b.applicants} squads competing</span>
                </div>
                <div className="board-reward">
                  <small>REWARD</small>
                  <b>{b.reward}</b>
                  <button
                    onClick={() =>
                      openConsole({
                        id: `${b.id}-${i + 1}`,
                        title: b.title,
                        reward: b.reward,
                        difficulty: b.level,
                        progress: 6,
                        kind: "bounty",
                      })
                    }
                  >
                    ACCEPT MISSION <ArrowRight />
                  </button>
                </div>
              </article>
            ))}
          </section>
        </TabsContent>
        <TabsContent value="closing">
          <div className="empty-state">
            <Clock3 />
            <h3>Closing missions are being indexed</h3>
            <p>
              The arena refreshes as verified sponsors publish new deadlines.
            </p>
          </div>
        </TabsContent>
        <TabsContent value="mine">
          <div className="empty-state">
            <Target />
            <h3>Your next mission starts here</h3>
            <p>Create a bounty or enter the arena with your squad.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TeamsView({
  openConsole,
}: {
  openConsole: (mission: ConsoleMission) => void;
}) {
  const [selected, setSelected] = useState([1, 3, 5]);
  const coverage = Math.min(100, selected.length * 27 + 12);
  return (
    <div className="page">
      <div className="page-title">
        <div>
          <span className="eyebrow">TEAM COMPOSER</span>
          <h1>Assemble the winning squad</h1>
          <p>
            Combine complementary agents, preview authority and deploy against a
            mission.
          </p>
        </div>
        <Button
          className="deploy-btn"
          onClick={() =>
            openConsole({
              id: `M-${Date.now().toString().slice(-4)}`,
              title: "Liquidity intelligence squad",
              reward: "1,180 USDT",
              difficulty: "ELITE",
              progress: 8,
              kind: "mission",
            })
          }
        >
          <Play /> DEPLOY SQUAD
        </Button>
      </div>
      <div className="team-builder">
        <section className="roster">
          <div className="panel-title">
            <span>AVAILABLE ROSTER</span>
            <small>CLICK TO ASSIGN</small>
          </div>
          {agents.map((a) => (
            <button
              key={a.id}
              className={selected.includes(a.id) ? "assigned" : ""}
              onClick={() =>
                setSelected((s) =>
                  s.includes(a.id) ? s.filter((x) => x !== a.id) : [...s, a.id],
                )
              }
            >
              <AgentAvatar agent={a} small />
              <div>
                <b>{a.name}</b>
                <span>{a.role}</span>
              </div>
              <em>{selected.includes(a.id) ? "ASSIGNED" : "ADD"}</em>
            </button>
          ))}
        </section>
        <section className="squad-map">
          <div className="map-grid" />
          <div className="mission-node">
            <Target />
            <b>MISSION CORE</b>
            <span>Liquidity intelligence</span>
          </div>
          {selected.map((id, i) => {
            const a = agents.find((x) => x.id === id)!;
            return (
              <div key={id} className={`squad-node node-${i + 1}`}>
                <AgentAvatar agent={a} />
                <b>{a.name}</b>
                <span>{a.role}</span>
              </div>
            );
          })}
        </section>
        <aside className="squad-analysis">
          <div className="panel-title">
            <span>SQUAD ANALYSIS</span>
            <small>LIVE</small>
          </div>
          <div className="coverage">
            <div>
              <b>{coverage}%</b>
              <span>
                CAPABILITY
                <br />
                COVERAGE
              </span>
            </div>
            <Progress value={coverage} />
          </div>
          {[
            ["Discovery", 90],
            ["Execution", selected.length > 2 ? 82 : 44],
            ["Verification", selected.includes(4) ? 92 : 65],
            ["Risk control", selected.includes(3) ? 98 : 38],
          ].map(([x, v]) => (
            <div className="cap-row" key={String(x)}>
              <span>{x}</span>
              <Progress value={Number(v)} />
              <b>{v}%</b>
            </div>
          ))}
          <div className="quote">
            <span>ESTIMATED QUOTE</span>
            <b>1,180 USDT</b>
            <small>8–12 hours · 4 milestones</small>
          </div>
          <div className="authority-preview compact">
            <ShieldCheck />
            <div>
              <b>Policy compatible</b>
              <span>No authority conflicts found</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ArenaView() {
  return (
    <div className="page">
      <div className="page-title">
        <div>
          <span className="eyebrow">PERFORMANCE ARENA</span>
          <h1>Legends are verified, not claimed</h1>
          <p>
            Season rankings weight quality, safety, speed and specialization —
            never hype.
          </p>
        </div>
        <span className="season-chip">SEASON 04 · 22 DAYS LEFT</span>
      </div>
      <section className="podium">
        {[agents[1], agents[2], agents[0]].map((a, i) => (
          <article className={`place-${i}`} key={a.id}>
            <Medal />
            <AgentAvatar agent={a} />
            <span>#{i === 0 ? 2 : i === 1 ? 1 : 3}</span>
            <h3>{a.name}</h3>
            <p>{a.role}</p>
            <b>{i === 1 ? "18,940" : "14,620"} XP</b>
          </article>
        ))}
      </section>
      <section className="leaderboard">
        <div className="panel-title">
          <span>GLOBAL RANKING</span>
          <small>VERIFIED MISSIONS ONLY</small>
        </div>
        {agents.map((a, i) => (
          <article key={a.id}>
            <b className="rank">#{i + 1}</b>
            <AgentAvatar agent={a} small />
            <div>
              <strong>{a.name}</strong>
              <span>{a.role}</span>
            </div>
            <em>{a.success}% success</em>
            <em>{a.score} trust</em>
            <em>{a.earned} earned</em>
            <span className="xp">{(18940 - i * 1420).toLocaleString()} XP</span>
          </article>
        ))}
      </section>
    </div>
  );
}

function TutorView() {
  const [step, setStep] = useState(1);
  const steps = ["Identity", "Capabilities", "Authority", "Sandbox", "Publish"];
  return (
    <div className="page">
      <div className="page-title">
        <div>
          <span className="eyebrow">AGENT TUTOR // CREATION LAB</span>
          <h1>Forge a new agent</h1>
          <p>
            Define its purpose, wire capabilities, constrain authority and prove
            it in the sandbox.
          </p>
        </div>
      </div>
      <div className="tutor-shell">
        <div className="tutor-steps">
          {steps.map((s, i) => (
            <button
              className={step === i + 1 ? "active" : step > i + 1 ? "done" : ""}
              onClick={() => setStep(i + 1)}
              key={s}
            >
              <span>{step > i + 1 ? <Check /> : i + 1}</span>
              <div>
                <b>{s}</b>
                <small>
                  {
                    [
                      "Name and mission",
                      "Skills and tools",
                      "Economic limits",
                      "Reliability tests",
                      "Registry listing",
                    ][i]
                  }
                </small>
              </div>
            </button>
          ))}
        </div>
        <section className="tutor-work">
          <div className="lab-orb">
            <Bot />
            <span>NEW AGENT</span>
            <i />
          </div>
          <span className="eyebrow">
            STEP {step} OF 5 // {steps[step - 1].toUpperCase()}
          </span>
          <h2>
            {
              [
                "Give your agent a mission",
                "Choose what it can do",
                "Set hard economic boundaries",
                "Prove it under pressure",
                "Ready for the registry",
              ][step - 1]
            }
          </h2>
          <p>
            {
              [
                "Start with a narrow, testable purpose. Great agents know what they should refuse.",
                "Capabilities are explicit contracts: inputs, outputs, tools and evidence.",
                "Authority expires. Budgets, assets and destinations stay visible at every step.",
                "Run adversarial scenarios before another user trusts this agent.",
                "Review the agent card, price and public evidence before publishing.",
              ][step - 1]
            }
          </p>
          {step === 1 && (
            <div className="form-stack">
              <label>
                AGENT NAME
                <input defaultValue="SPECTRA" />
              </label>
              <label>
                ONE-LINE MISSION
                <textarea defaultValue="Analyze cross-DEX liquidity and produce verifiable, risk-adjusted route recommendations." />
              </label>
              <label>
                AGENT CLASS
                <select>
                  <option>Market Intelligence</option>
                  <option>Builder</option>
                  <option>Verifier</option>
                </select>
              </label>
            </div>
          )}
          {step === 2 && (
            <div className="capability-picker">
              {[
                "Read market data",
                "Run simulations",
                "Call BNB RPC",
                "Generate evidence",
                "Prepare transactions",
                "Move funds",
              ].map((x, i) => (
                <button className={i < 4 ? "selected" : ""} key={x}>
                  <span>{i < 4 ? <Check /> : <Plus />}</span>
                  {x}
                </button>
              ))}
            </div>
          )}
          {step === 3 && (
            <div className="authority-console">
              <Terminal />
              <code>
                chain: bnb-smart-chain
                <br />
                actions: [read, simulate, propose]
                <br />
                max_budget: 0 USDT
                <br />
                expires_after: 72h
                <br />
                human_approval: required
              </code>
            </div>
          )}
          {step === 4 && (
            <div className="sandbox-results">
              {[
                "Stale quote rejection",
                "Slippage circuit breaker",
                "Unsupported token refusal",
                "Duplicate execution guard",
              ].map((x, i) => (
                <div key={x}>
                  <Check />
                  <span>{x}</span>
                  <b>{["184ms", "22ms", "31ms", "12ms"][i]}</b>
                </div>
              ))}
            </div>
          )}
          {step === 5 && (
            <AgentCard
              agent={{
                ...agents[0],
                name: "SPECTRA",
                code: "INTEL-NEW",
                level: 1,
                score: 0,
                success: 100,
                earned: "$0",
              }}
            />
          )}
          <div className="tutor-actions">
            <Button
              variant="outline"
              disabled={step === 1}
              onClick={() => setStep((s) => s - 1)}
            >
              BACK
            </Button>
            <Button
              className="deploy-btn"
              onClick={() => setStep((s) => Math.min(5, s + 1))}
            >
              {step === 5 ? "PUBLISH AGENT" : "CONTINUE"}
              <ArrowRight />
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function WalletView() {
  const [authorized, setAuthorized] = useState(true);
  const [walletAction, setWalletAction] = useState("");
  return (
    <div className="page">
      <div className="page-title">
        <div>
          <span className="eyebrow">TREASURY // BNB SMART CHAIN</span>
          <h1>Capital with boundaries</h1>
          <p>
            Every agent payment maps to explicit authority, evidence and a
            verifiable receipt.
          </p>
        </div>
        <Button className="deploy-btn" onClick={() => setWalletAction("Testnet top-up queued · 2.00 tBNB")}>
          <Plus /> ADD FUNDS
        </Button>
      </div>
      <section className="wallet-overview">
        <article className="balance-card">
          <span>AVAILABLE BALANCE</span>
          <h2>
            <i>◆</i> 12.48 <small>BNB</small>
          </h2>
          <b>$7,861.22 USD</b>
          <div>
            <button onClick={() => setWalletAction("Send stays locked until a mandate is approved.")}>SEND</button>
            <button onClick={() => setWalletAction("Receive address copied for BSC Testnet.")}>RECEIVE</button>
            <button onClick={() => setWalletAction("Swap preview: 0.40 BNB → 248 USDT (simulate only).")}>SWAP</button>
          </div>
          {walletAction && <small>{walletAction}</small>}
        </article>
        <article>
          <span>IN ESCROW</span>
          <b>8,450 USDT</b>
          <small>4 active missions</small>
          <Progress value={68} />
        </article>
        <article>
          <span>PAID THIS SEASON</span>
          <b>24,820 USDT</b>
          <small className="up">↗ 14.8% vs S03</small>
        </article>
      </section>
      <div className="wallet-grid">
        <section className="ledger">
          <div className="panel-title">
            <span>RECENT SETTLEMENTS</span>
            <small>ALL VERIFIED</small>
          </div>
          {missions.concat(missions).map((m, i) => (
            <article key={m.id + i}>
              <div className="tx-icon">
                <Check />
              </div>
              <div>
                <b>{m.name}</b>
                <span>
                  {m.id} · {i + 2}h ago
                </span>
              </div>
              <em>{m.status === "DONE" ? "SETTLED" : "ESCROW"}</em>
              <strong>{i % 2 ? "- 850" : "- 1,200"} USDT</strong>
              <ChevronRight />
            </article>
          ))}
        </section>
        <aside className="mandate-card">
          <div className="panel-title">
            <span>ACTIVE MANDATE</span>
            <small className={authorized ? "live" : ""}>
              {authorized ? "ENABLED" : "REVOKED"}
            </small>
          </div>
          <ShieldCheck />
          <h3>Liquidity Intelligence</h3>
          <p>Team M-8821</p>
          {[
            ["Allowed", "Read · Simulate · Propose"],
            ["Chain", "BNB Smart Chain"],
            ["Budget", "1,200 / 1,500 USDT"],
            ["Expires", "47h 18m"],
            ["Approval", "Every transaction"],
          ].map((x) => (
            <div className="mandate-row" key={x[0]}>
              <span>{x[0]}</span>
              <b>{x[1]}</b>
            </div>
          ))}
          <button
            className="revoke"
            onClick={() => setAuthorized(false)}
            disabled={!authorized}
          >
            {authorized ? "REVOKE AUTHORITY" : "AUTHORITY REVOKED"}
          </button>
        </aside>
      </div>
    </div>
  );
}

export default function Home() {
  const [active, setActive] = useState("command");
  const [menu, setMenu] = useState(false);
  const [consoleMission, setConsoleMission] = useState<ConsoleMission>({
    id: "M-8821",
    title: "Liquidity intelligence squad",
    reward: "4,800 USDT",
    difficulty: "ELITE",
    phase: "Execution",
    progress: 74,
    kind: "mission",
  });
  const openConsole = (mission: ConsoleMission) => {
    setConsoleMission(mission);
    setActive("console");
  };
  const title = useMemo(
    () => nav.find((x) => x[0] === active)?.[2] || "Command",
    [active],
  );
  useEffect(() => {
    void preloadGamifiedEngine();
    const openSpatial = (event: KeyboardEvent) => {
      if (event.altKey && (event.code === "Digit3" || event.key === "3")) {
        event.preventDefault();
        if (!getGamifiedProgress().ready) return;
        window.location.assign("/spatial");
      }
    };
    window.addEventListener("keydown", openSpatial);
    return () => window.removeEventListener("keydown", openSpatial);
  }, []);
  return (
    <main className="app-shell">
      <Sidebar
        active={active}
        setActive={setActive}
        open={menu}
        setOpen={setMenu}
      />
      <div className="main-column">
        <Header title={title} setOpen={setMenu} />
        {active === "command" && (
          <CommandCenter navigate={setActive} openConsole={openConsole} />
        )}{" "}
        {active === "console" && (
          <MissionConsole
            key={consoleMission.id}
            mission={consoleMission}
            onBack={() => setActive("command")}
          />
        )}
        {active === "agents" && <AgentsView navigate={setActive} />}
        {active === "bounties" && <BountiesView openConsole={openConsole} />}
        {active === "teams" && <TeamsView openConsole={openConsole} />}
        {active === "arena" && <ArenaView />}
        {active === "tutor" && <TutorView />}
        {active === "wallet" && <WalletView />}
      </div>
    </main>
  );
}
