"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  Check,
  ChevronLeft,
  CirclePause,
  Clock3,
  FileCheck2,
  Gem,
  Play,
  Radio,
  ShieldCheck,
  Target,
  Terminal,
  Zap,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export type ConsoleMission = {
  id: string;
  title: string;
  reward: string;
  difficulty?: string;
  phase?: string;
  progress?: number;
  kind: "mission" | "bounty";
};
const squad = [
  { name: "NEXUS", role: "Discovery", glyph: "◈", color: "cyan" },
  { name: "VECTOR", role: "Simulation", glyph: "V", color: "violet" },
  { name: "AEGIS", role: "Risk guard", glyph: "A", color: "yellow" },
  { name: "ORACLE", role: "Verification", glyph: "O", color: "emerald" },
];
const phases = [
  "Scope locked",
  "Sources acquired",
  "Routes simulated",
  "Risk gate passed",
  "Evidence verified",
  "Settlement ready",
];
const logLines = [
  ["NEXUS", "Indexed 18 BNB liquidity pools · block 52,841,092"],
  ["VECTOR", "Simulating 240 routes with slippage boundaries"],
  ["AEGIS", "Rejected 7 routes outside mandate risk limits"],
  ["ORACLE", "Attesting source blocks and calculation digest"],
  ["VECTOR", "Best risk-adjusted route improved by 2.8%"],
  ["AEGIS", "Budget and selector policy remain compliant"],
  ["ORACLE", "Evidence package sealed · verdict pending"],
];

export function MissionConsole({
  mission,
  onBack,
}: {
  mission: ConsoleMission;
  onBack: () => void;
}) {
  const [start] = useState(() => mission.progress ?? 12),
    [progress, setProgress] = useState(start),
    [running, setRunning] = useState(true),
    [tick, setTick] = useState(2);
  useEffect(() => {
    if (!running || progress >= 96) return;
    const timer = setInterval(() => {
      setProgress((value) => Math.min(96, value + 1));
      setTick((value) => Math.min(logLines.length, value + 1));
    }, 1800);
    return () => clearInterval(timer);
  }, [running, progress]);
  const phaseIndex = Math.min(phases.length - 1, Math.floor(progress / 18)),
    phase = phases[phaseIndex];
  const elapsed = useMemo(
    () =>
      `00:${String(Math.floor(progress / 3)).padStart(2, "0")}:${String((progress * 7) % 60).padStart(2, "0")}`,
    [progress],
  );
  return (
    <div className="page console-page">
      <div className="console-toolbar">
        <button onClick={onBack}>
          <ChevronLeft /> BACK TO COMMAND
        </button>
        <div>
          <span className="console-live">
            <i /> LIVE EXECUTION
          </span>
          <small>{mission.id} · BSC TESTNET</small>
        </div>
        <Button variant="outline" onClick={() => setRunning((value) => !value)}>
          {running ? <CirclePause /> : <Play />}
          {running ? "PAUSE SQUAD" : "RESUME SQUAD"}
        </Button>
      </div>
      <section className="console-hero">
        <div>
          <span className="eyebrow">
            {mission.kind === "bounty" ? "BOUNTY ACCEPTED" : "ACTIVE MISSION"}{" "}
            // {mission.difficulty || "ELITE"}
          </span>
          <h1>{mission.title}</h1>
          <p>
            Autonomous squad executing under a revocable 72-hour economic
            mandate.
          </p>
        </div>
        <div className="console-reward">
          <Gem />
          <span>ESCROWED REWARD</span>
          <b>{mission.reward}</b>
          <small>ERC-8183 · release after verified evidence</small>
        </div>
      </section>
      <section className="console-stats">
        <article>
          <Activity />
          <span>MISSION PROGRESS</span>
          <b>{progress}%</b>
          <Progress value={progress} />
        </article>
        <article>
          <Clock3 />
          <span>ELAPSED TIME</span>
          <b>{elapsed}</b>
          <small>ETA 02:14:30</small>
        </article>
        <article>
          <ShieldCheck />
          <span>MANDATE STATUS</span>
          <b className="safe">COMPLIANT</b>
          <small>847 / 1,200 USDT available</small>
        </article>
        <article>
          <FileCheck2 />
          <span>EVIDENCE</span>
          <b>{Math.max(3, tick * 4)} ITEMS</b>
          <small>
            {tick > 5 ? "Digest sealing" : "Collecting and verifying"}
          </small>
        </article>
      </section>
      <div className="console-grid">
        <section className="battlefield">
          <div className="battle-grid" />
          <div className="mission-core">
            <Target />
            <strong>MISSION CORE</strong>
            <span>{phase}</span>
            <i
              style={
                { "--mission-progress": `${progress}%` } as React.CSSProperties
              }
            />
          </div>
          {squad.map((agent, index) => (
            <article
              className={`battle-agent battle-agent-${index + 1} ${running ? "working" : ""}`}
              key={agent.name}
            >
              <div className={`console-avatar agent-${agent.color}`}>
                <span>{agent.glyph}</span>
                <i />
              </div>
              <b>{agent.name}</b>
              <small>{agent.role}</small>
              <em>{index <= phaseIndex ? "EXECUTING" : "QUEUED"}</em>
            </article>
          ))}
          <div className="data-stream stream-a" />
          <div className="data-stream stream-b" />
          <div className="data-stream stream-c" />
          <div className="data-stream stream-d" />
        </section>
        <aside className="objective-panel">
          <div className="panel-title">
            <span>MISSION OBJECTIVES</span>
            <small>
              {phaseIndex + 1}/{phases.length}
            </small>
          </div>
          {phases.map((item, index) => (
            <div
              className={`objective-row ${index < phaseIndex ? "done" : index === phaseIndex ? "active" : ""}`}
              key={item}
            >
              <span>{index < phaseIndex ? <Check /> : index + 1}</span>
              <div>
                <b>{item}</b>
                <small>
                  {index < phaseIndex
                    ? "Verified"
                    : index === phaseIndex
                      ? "In progress"
                      : "Awaiting squad"}
                </small>
              </div>
            </div>
          ))}
          <div className="authority-box">
            <ShieldCheck />
            <div>
              <b>Authority shield active</b>
              <span>read · simulate · propose</span>
              <small>Transfers require your approval</small>
            </div>
          </div>
        </aside>
      </div>
      <section className="console-bottom">
        <div className="activity-feed">
          <div className="panel-title">
            <span>LIVE SQUAD ACTIVITY</span>
            <small>
              <Radio /> STREAMING
            </small>
          </div>
          {logLines
            .slice(0, tick)
            .reverse()
            .map((line, index) => (
              <div className="log-row" key={line[1]}>
                <time>{`+0${index}:${String(12 + index * 7).padStart(2, "0")}`}</time>
                <b>{line[0]}</b>
                <span>{line[1]}</span>
                <i className={index === 0 && running ? "pulse" : ""} />
              </div>
            ))}
        </div>
        <aside className="settlement-panel">
          <Terminal />
          <span>NEXT CHECKPOINT</span>
          <h3>{progress < 90 ? "Evidence verdict" : "Settlement approval"}</h3>
          <p>
            {progress < 90
              ? "Oracle validates every source and seals a reproducible result before funds can move."
              : "All work is complete. Your approval will release the escrowed reward."}
          </p>
          <button disabled={progress < 90}>
            <Zap />
            {progress < 90
              ? `UNLOCKS AT 90% · ${90 - progress}% LEFT`
              : "REVIEW & SETTLE"}
          </button>
        </aside>
      </section>
    </div>
  );
}
