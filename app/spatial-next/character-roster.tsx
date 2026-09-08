"use client";

import { useEffect, useMemo, useState } from "react";
import { AGENT_LINES, DEPLOY_LINE, voiceProfile } from "@/lib/agent-voice";
import { playAgentSpeech, stopAgentSpeech, type VoicePlayMeta } from "./agent-speaker";
import { AgentAura } from "./agent-aura";
import { SpeakingPortrait, type SpeechCue } from "./speaking-portrait";

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
  portrait: string;
  auraRate: number;
  mouthLine: number;
};

const AGENTS: Agent[] = [
  { id: "scout", name: "KAI", role: "SCOUT", level: 18, accent: "#40d7ff", short: "Explore · Discover · Alert", traits: ["Fast", "Wide", "Curious"], stats: ["1,248 contracts scanned", "37 opportunities found", "94% signal accuracy"], line: AGENT_LINES.scout, portrait: "/agents/kai.png", auraRate: 11, mouthLine: 0.4 },
  { id: "analyst", name: "LYRA", role: "ANALYST", level: 24, accent: "#a78bfa", short: "Decode · Research · Score", traits: ["Deep", "Precise", "Rigorous"], stats: ["412 protocols analyzed", "128 risk reports", "96% analysis success"], line: AGENT_LINES.analyst, portrait: "/agents/lyra.png", auraRate: 9, mouthLine: 0.41 },
  { id: "commander", name: "ORION", role: "COMMANDER", level: 32, accent: "#f3ba2f", short: "Orchestrate · Adapt · Evolve", traits: ["Strategic", "Vision", "Leadership"], stats: ["184 missions created", "$47,320 total earned", "92% mission success"], line: AGENT_LINES.commander, portrait: "/agents/orion.png", auraRate: 14, mouthLine: 0.43 },
  { id: "strategist", name: "NOVA", role: "STRATEGIST", level: 21, accent: "#8f7cff", short: "Plan · Simulate · Optimize", traits: ["Smart", "Adaptive", "Efficient"], stats: ["1,024 simulations", "317 optimized routes", "68% higher average ROI"], line: AGENT_LINES.strategist, portrait: "/agents/nova.png", auraRate: 10, mouthLine: 0.4 },
  { id: "executor", name: "REX", role: "EXECUTOR", level: 27, accent: "#ff5151", short: "Trade · Deploy · Settle", traits: ["Atomic", "Reliable", "Profitable"], stats: ["846 transactions", "$124,882 profit generated", "99.1% execution success"], line: AGENT_LINES.executor, portrait: "/agents/rex.png", auraRate: 13, mouthLine: 0.42 },
  { id: "guardian", name: "AEGIS", role: "GUARDIAN", level: 19, accent: "#50e3a4", short: "Protect · Monitor · Balance", traits: ["Secure", "Alert", "Trusted"], stats: ["128 threats blocked", "0 critical incidents", "100% funds protected"], line: AGENT_LINES.guardian, portrait: "/agents/aegis.png", auraRate: 8, mouthLine: 0.41 },
];

export function CharacterRoster() {
  const [selectedId, setSelectedId] = useState("scout");
  const [missionState, setMissionState] = useState<"idle" | "deploying" | "active">("idle");
  const [speech, setSpeech] = useState<SpeechCue | null>(null);
  const [voiceMeta, setVoiceMeta] = useState<VoicePlayMeta | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [farmTick, setFarmTick] = useState(0);
  const selected = useMemo(() => AGENTS.find((agent) => agent.id === selectedId) ?? AGENTS[0], [selectedId]);

  useEffect(() => {
    const id = window.setInterval(() => setFarmTick((value) => value + 1), 90);
    return () => {
      window.clearInterval(id);
      stopAgentSpeech();
    };
  }, []);

  const speakLine = async (agentId: string, text: string) => {
    const id = Date.now();
    setVoiceBusy(true);
    setSpeech({ id, agentId, text });
    try {
      await playAgentSpeech(agentId, text, (meta) => {
        setVoiceMeta(meta);
        setSpeech((current) => (current?.id === id ? { ...current, durationMs: meta.durationMs } : current));
      });
    } finally {
      setVoiceBusy(false);
    }
  };

  const deploy = () => {
    if (missionState !== "idle") return;
    setMissionState("deploying");
    speakLine("commander", DEPLOY_LINE);
    window.setTimeout(() => setMissionState("active"), 1300);
  };

  return (
    <section className="agent-roster-shell">
      <div className="agent-roster-head">
        <div>
          <span>BINANCEFF // AGENT ECONOMY</span>
          <h2>CHOOSE YOUR OPERATING TEAM</h2>
        </div>
        <div className="agent-live-pill"><i /> {voiceMeta ? `${voiceMeta.label} · ${voiceMeta.voice}` : "NEURAL VOICE READY"}</div>
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
              <div className={`agent-portrait${speech?.agentId === agent.id ? " is-speaking" : ""}`}>
                <SpeakingPortrait
                  src={agent.portrait}
                  alt={`${agent.name} ${agent.role}`}
                  mouthLine={agent.mouthLine}
                  rate={voiceProfile(agent.id).rate}
                  speech={speech}
                  speaking={speech?.agentId === agent.id}
                />
                <AgentAura accent={agent.accent} selected={active} />
                <div className="agent-aura-chip">
                  <b>AURA FARMING</b>
                  <span>+{(agent.level * 184 + farmTick * agent.auraRate).toLocaleString()}</span>
                </div>
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
        <div className={`agent-detail-face${speech?.agentId === selected.id ? " is-speaking" : ""}`}>
          <SpeakingPortrait
            src={selected.portrait}
            alt={`${selected.name} ${selected.role}`}
            mouthLine={selected.mouthLine}
            rate={voiceProfile(selected.id).rate}
            speech={speech}
            speaking={speech?.agentId === selected.id}
          />
          <AgentAura accent={selected.accent} selected />
        </div>
        <div className="agent-detail-main">
          <span className="agent-detail-kicker">ACTIVE CHARACTER</span>
          <h3>{selected.name} <small>{selected.role}</small></h3>
          <p>{selected.line}</p>
          <div className="agent-stats">{selected.stats.map((stat) => <span key={stat}>{stat}</span>)}</div>
        </div>
        <div className="agent-actions">
          <button type="button" disabled={voiceBusy} onClick={() => speakLine(selected.id, selected.line)}>
            {voiceBusy && speech?.agentId === selected.id ? "SYNTHESIZING…" : "HEAR AGENT"}
          </button>
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
