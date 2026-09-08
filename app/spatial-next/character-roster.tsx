"use client";

import { useMemo, useState } from "react";

type Agent = {
  id: string;
  name: string;
  role: string;
  level: number;
  accent: string;
  short: string;
  traits: string[];
  stats: string[];
  line: string;
};

const AGENTS: Agent[] = [
  { id: "scout", name: "KAI", role: "SCOUT", level: 18, accent: "#40d7ff", short: "Explore · Discover · Alert", traits: ["Fast", "Wide", "Curious"], stats: ["1,248 contracts scanned", "37 opportunities found", "94% signal accuracy"], line: "Commander, I found an unusual liquidity movement on Arbitrum." },
  { id: "analyst", name: "LYRA", role: "ANALYST", level: 24, accent: "#a78bfa", short: "Decode · Research · Score", traits: ["Deep", "Precise", "Rigorous"], stats: ["412 protocols analyzed", "128 risk reports", "96% analysis success"], line: "The route is viable, but the edge disappears above twenty eight thousand dollars." },
  { id: "commander", name: "ORION", role: "COMMANDER", level: 32, accent: "#f3ba2f", short: "Orchestrate · Adapt · Evolve", traits: ["Strategic", "Vision", "Leadership"], stats: ["184 missions created", "$47,320 total earned", "92% mission success"], line: "Scout found the signal. Analyst validated it. Strategist, build the optimal route." },
  { id: "strategist", name: "NOVA", role: "STRATEGIST", level: 21, accent: "#8f7cff", short: "Plan · Simulate · Optimize", traits: ["Smart", "Adaptive", "Efficient"], stats: ["1,024 simulations", "317 optimized routes", "68% higher average ROI"], line: "Optimal route ready. USDC to WETH on Camelot, exit through Uniswap, projected profit forty two dollars." },
  { id: "executor", name: "REX", role: "EXECUTOR", level: 27, accent: "#ff5151", short: "Trade · Deploy · Settle", traits: ["Atomic", "Reliable", "Profitable"], stats: ["846 transactions", "$124,882 profit generated", "99.1% execution success"], line: "Route confirmed. Nonce locked. Execution engine standing by." },
  { id: "guardian", name: "AEGIS", role: "GUARDIAN", level: 19, accent: "#50e3a4", short: "Protect · Monitor · Balance", traits: ["Secure", "Alert", "Trusted"], stats: ["128 threats blocked", "0 critical incidents", "100% funds protected"], line: "Risk approved. Slippage and exposure remain inside policy." },
];

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 0.92;
  window.speechSynthesis.speak(utterance);
}

export function CharacterRoster() {
  const [selectedId, setSelectedId] = useState("commander");
  const [missionState, setMissionState] = useState<"idle" | "deploying" | "active">("idle");
  const selected = useMemo(() => AGENTS.find((agent) => agent.id === selectedId) ?? AGENTS[2], [selectedId]);

  const deploy = () => {
    if (missionState !== "idle") return;
    setMissionState("deploying");
    speak("Deploying mission. Agent team assembling.");
    window.setTimeout(() => setMissionState("active"), 1300);
  };

  return (
    <section className="agent-roster-shell">
      <div className="agent-roster-head">
        <div>
          <span>BINANCEFF // AGENT ECONOMY</span>
          <h2>CHOOSE YOUR OPERATING TEAM</h2>
        </div>
        <div className="agent-live-pill"><i /> LIVE RUNTIME</div>
      </div>

      <div className="agent-roster-grid">
        {AGENTS.map((agent) => {
          const active = agent.id === selectedId;
          return (
            <button
              key={agent.id}
              type="button"
              className={`agent-card${active ? " is-selected" : ""}`}
              style={{ ["--agent-accent" as string]: agent.accent }}
              onClick={() => setSelectedId(agent.id)}
            >
              <div className={`agent-avatar agent-avatar-${agent.id}`} aria-hidden="true">
                <div className="agent-avatar-ring" />
                <div className="agent-avatar-head" />
                <div className="agent-avatar-body" />
                <div className="agent-avatar-core" />
              </div>
              <div className="agent-card-copy">
                <div className="agent-role">{agent.role}</div>
                <div className="agent-name">{agent.name}</div>
                <div className="agent-short">{agent.short}</div>
                <div className="agent-traits">{agent.traits.map((trait) => <span key={trait}>{trait}</span>)}</div>
                <div className="agent-level"><b>LVL {agent.level}</b><i><em style={{ width: `${Math.min(100, agent.level * 2.7)}%` }} /></i></div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="agent-detail-panel" style={{ ["--agent-accent" as string]: selected.accent }}>
        <div className="agent-detail-main">
          <span className="agent-detail-kicker">ACTIVE CHARACTER</span>
          <h3>{selected.name} <small>{selected.role}</small></h3>
          <p>{selected.line}</p>
          <div className="agent-stats">{selected.stats.map((stat) => <span key={stat}>{stat}</span>)}</div>
        </div>
        <div className="agent-actions">
          <button type="button" onClick={() => speak(selected.line)}>HEAR AGENT</button>
          <button type="button" className="agent-action-primary" onClick={deploy}>
            {missionState === "idle" ? "DEPLOY MISSION" : missionState === "deploying" ? "ASSEMBLING TEAM…" : "MISSION ACTIVE"}
          </button>
        </div>
      </div>

      {missionState === "active" ? (
        <div className="agent-mission-strip">
          <strong>MISSION LIVE</strong>
          <span>Scout scanning Arbitrum</span><i />
          <span>Analyst validating route</span><i />
          <span>Strategist simulating</span><i />
          <span>Executor standing by</span>
        </div>
      ) : null}
    </section>
  );
}
