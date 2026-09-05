"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Check,
  ChevronLeft,
  CirclePause,
  Clock3,
  FileCheck2,
  Gem,
  Play,
  Radio,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { MissionWorld3D } from "./mission-world-3d";

export type ConsoleMission = {
  id: string;
  title: string;
  reward: string;
  difficulty?: string;
  phase?: string;
  progress?: number;
  kind: "mission" | "bounty";
};
const phases = [
  "Goal agreed",
  "Information gathered",
  "Options tested",
  "Risks checked",
  "Result verified",
  "Payment ready",
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
    [tick, setTick] = useState(2),
    [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!running || progress >= 96) return;
    const timer = setInterval(() => {
      setProgress((value) => Math.min(96, value + 1));
      setTick((value) => Math.min(logLines.length, value + 1));
    }, 1800);
    return () => clearInterval(timer);
  }, [running, progress]);
  const phaseIndex = Math.min(phases.length - 1, Math.floor(progress / 18));
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
            {`// ${mission.difficulty || "ELITE"}`}
          </span>
          <h1>{mission.title}</h1>
          <p>
            Four AI agents are working together. You can watch what each one
            does, stop them at any time, and pay only after the result is
            checked.
          </p>
        </div>
        <div className="console-reward">
          <Gem />
          <span>REWARD RESERVED</span>
          <b>{mission.reward}</b>
          <small>Paid only when the result is verified</small>
        </div>
      </section>
      <section className="console-stats">
        <article>
          <Activity />
          <span>HOW MUCH IS DONE</span>
          <b>{progress}%</b>
          <Progress value={progress} />
        </article>
        <article>
          <Clock3 />
          <span>TIME WORKING</span>
          <b>{elapsed}</b>
          <small>ETA 02:14:30</small>
        </article>
        <article>
          <ShieldCheck />
          <span>SAFETY LIMITS</span>
          <b className="safe">ALL SAFE</b>
          <small>Agents cannot spend or transfer without approval</small>
        </article>
        <article>
          <FileCheck2 />
          <span>PROOF COLLECTED</span>
          <b>{Math.max(3, tick * 4)} ITEMS</b>
          <small>
            {tick > 5
              ? "Final proof being sealed"
              : "Sources are being checked"}
          </small>
        </article>
      </section>
      <div className="console-grid">
        <section className="battlefield">
          <MissionWorld3D progress={progress} running={running} />
        </section>
        <aside className="objective-panel">
          <div className="panel-title">
            <span>WHAT HAPPENS NEXT</span>
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
                      ? "Happening now"
                      : "Comes next"}
                </small>
              </div>
            </div>
          ))}
          <div className="authority-box">
            <ShieldCheck />
            <div>
              <b>You remain in control</b>
              <span>Agents may read, test and recommend</span>
              <small>They cannot move money without you</small>
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
          <h3>{settled ? "Escrow released" : progress < 90 ? "Evidence verdict" : "Settlement approval"}</h3>
          <p>
            {settled
              ? `${mission.reward} left escrow after your approval. The squad receipt is sealed on BNB testnet.`
              : progress < 90
                ? "Oracle validates every source and seals a reproducible result before funds can move."
                : "All work is complete. Your approval will release the escrowed reward."}
          </p>
          <button
            disabled={settled}
            onClick={() => {
              if (progress < 90) {
                setProgress(90);
                setTick(logLines.length);
                setRunning(false);
                return;
              }
              setProgress(100);
              setRunning(false);
              setSettled(true);
            }}
          >
            <Zap />
            {settled
              ? "SETTLED · RECEIPT SEALED"
              : progress < 90
                ? "ADVANCE TO VERDICT"
                : "REVIEW & SETTLE"}
          </button>
        </aside>
      </section>
    </div>
  );
}
