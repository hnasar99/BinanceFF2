"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { OPS_PHASES, rosterAgent, type OpsWorld } from "@/lib/ops-sim";
import { useSpatialI18n } from "../spatial/i18n-context";
import { ActivityScope } from "./activity-scope";
import { BountyDock } from "./bounty-dock";
import { LangSwitch } from "./lang-switch";
import { EXAMPLE_MISSION } from "./mission-model";
import { MissionPanel } from "./mission-panel";
import { SquadStage, type SquadStageHandle } from "./squad-stage";
import { StageCaptions } from "./stage-captions";
import { useOps } from "./ops-context";

function elapsed(startedAt: number, now: number) {
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function age(at: number, now: number) {
  const seconds = Math.max(0, Math.floor((now - at) / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m`;
}

function cautionMode(world: OpsWorld) {
  if (world.gate) return "amber";
  if (world.compliance.mandate === "REVOKED" || world.radar.decision === "KILL" || world.compliance.disputes) return "red";
  if (world.compliance.mandate === "ENABLED" && world.compliance.safe) return "green";
  return "idle";
}

function cautionKey(mode: string) {
  if (mode === "green") return "SAFE";
  if (mode === "amber") return "GATE";
  if (mode === "red") return "KILL";
  return "STANDBY";
}

function subscribeDesktop(onChange: () => void) {
  const media = window.matchMedia("(max-width: 1200px)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function OpsHud() {
  const ops = useOps();
  const { t, line } = useSpatialI18n();
  const { world, audibleId, settling, settleError, deploy, pause, resume, scanRadar, decide, settle, report, promoteVoice, agentWantsVoice } = ops;
  const [missionOpenOverride, setMissionOpenOverride] = useState<boolean | null>(null);
  const desktop = useSyncExternalStore(subscribeDesktop, () => !window.matchMedia("(max-width: 1200px)").matches, () => true);
  const missionOpen = missionOpenOverride ?? desktop;
  const [stageApi, setStageApi] = useState<SquadStageHandle | null>(null);
  const selected = useMemo(() => rosterAgent(world.selectedId), [world.selectedId]);
  const mission = world.mission;
  const caution = cautionMode(world);
  const phase = mission?.phaseIndex ?? -1;
  const clock = mission ? elapsed(mission.startedAt, world.now) : "00:00";
  const stageLive = Boolean(audibleId);

  const onReady = useCallback((api: SquadStageHandle) => setStageApi(api), []);

  const stick = (() => {
    if (world.gate?.kind === "settle") {
      return {
        mode: "gate" as const,
        primary: settling ? t("Waiting for wallet…") : t("Sign settlement"),
        primaryHint: "A",
        onPrimary: settle,
        secondary: t("Kill route"),
        secondaryHint: "K",
        onSecondary: () => decide("kill"),
        disabled: settling,
      };
    }
    if (world.gate?.kind === "verdict") {
      return {
        mode: "gate" as const,
        primary: t("Approve verdict"),
        primaryHint: "A",
        onPrimary: () => decide("approve"),
        secondary: t("Kill route"),
        secondaryHint: "K",
        onSecondary: () => decide("kill"),
        disabled: false,
      };
    }
    if (!mission || mission.status === "settled" || mission.status === "killed") {
      return {
        mode: "deploy" as const,
        primary: mission ? t("New operation") : t("Deploy mission"),
        primaryHint: "▶",
        onPrimary: () => deploy(EXAMPLE_MISSION.title, { brief: EXAMPLE_MISSION.brief, criteria: EXAMPLE_MISSION.criteria, reward: EXAMPLE_MISSION.reward }),
        secondary: world.radar.scanning ? t("Sweeping…") : t("Scan radar"),
        secondaryHint: "R",
        onSecondary: scanRadar,
        disabled: world.radar.scanning,
      };
    }
    if (world.running) {
      return {
        mode: "live" as const,
        primary: t("Pause"),
        primaryHint: "Space",
        onPrimary: pause,
        secondary: world.radar.scanning ? t("Sweeping…") : t("Scan radar"),
        secondaryHint: "R",
        onSecondary: scanRadar,
        disabled: world.radar.scanning,
      };
    }
    return {
      mode: "live" as const,
      primary: t("Resume"),
      primaryHint: "Space",
      onPrimary: resume,
      secondary: world.radar.scanning ? t("Sweeping…") : t("Scan radar"),
      secondaryHint: "R",
      onSecondary: scanRadar,
      disabled: world.radar.scanning,
    };
  })();

  const title = mission ? line(mission.title) : t("No mission deployed");
  const phaseTitle = phase >= 0 ? t(OPS_PHASES[phase]) : t("Awaiting deploy");

  return (
    <div className={`cockpit-hud is-${caution}${missionOpen ? "" : " is-mission-collapsed"}`}>
      <header className="mission-strip">
        <div className="ms-brand">
          <span>BinanceFF2</span>
          <strong>{t("Live Mission Room")}</strong>
        </div>
        <div className="ms-title">
          <span>{t("Current mission")}</span>
          <strong>{title}</strong>
        </div>
        <div className="ms-phase">
          <span>{phase >= 0 ? t("Phase {n} of {total}", { n: phase + 1, total: OPS_PHASES.length }) : t("Phase —")}</span>
          <strong>{phaseTitle}</strong>
        </div>
        <div className="ms-progress" aria-label={`${t("Progress")} ${world.compliance.completionPct}%`}>
          <span>{t("Progress")}</span>
          <b>{world.compliance.completionPct}%</b>
          <i><em style={{ width: `${world.compliance.completionPct}%` }} /></i>
        </div>
        <div className={`ms-status is-${caution}`}>
          <span>{t("Authority")}</span>
          <strong>{t(cautionKey(caution))}</strong>
        </div>
        <div className="ms-clock">
          <span>{t("Elapsed")}</span>
          <strong>{clock}</strong>
        </div>
        <div className="ms-tools">
          <button
            type="button"
            className="ms-mission-toggle"
            aria-expanded={missionOpen}
            onClick={() => setMissionOpenOverride((open) => !(open ?? desktop))}
          >
            {missionOpen ? t("Hide mission") : t("Show mission")}
          </button>
          <LangSwitch />
          <Link href="/" className="ms-exit">{t("Exit")}</Link>
        </div>
      </header>

      <MissionPanel
        stick={stick}
        tourStep={null}
        onOpenAgent={(id) => stageApi?.focusAgent(id)}
        onOpenBoard={(id) => stageApi?.focusBoard(id)}
      />

      <section className={`mission-stage${stageLive ? " is-live" : ""}${world.gate ? " is-gate" : ""}`} style={{ ["--agent-accent" as string]: selected.accent }}>
        <div className="stage-mission-banner" aria-live="polite">
          <span className={mission && world.running ? "is-running" : ""}>{mission && world.running ? t("Executing") : t("Ready")}</span>
          <div>
            <small>{t("Mission in command")}</small>
            <strong>{title}</strong>
          </div>
          <div>
            <small>{t("Current step")}</small>
            <strong>{phaseTitle}</strong>
          </div>
          <b>{world.compliance.completionPct}%</b>
        </div>
        <StageCaptions />
        <SquadStage onReady={onReady} />
        {world.gate ? (
          <div className="stage-gate">
            <small>{line(world.gate.label)}</small>
            <p>{line(world.gate.prompt)}</p>
            {settleError ? <p className="is-kill">{line(settleError)}</p> : null}
            <div>
              <button type="button" disabled={stick.disabled} onClick={stick.onPrimary}>{stick.primary}</button>
              <button type="button" className="cmd-kill" onClick={stick.onSecondary}>{stick.secondary}</button>
            </div>
          </div>
        ) : null}
      </section>

      <aside className="ops-rail">
        <div className="rail-head">
          <span>{t("Squad log")}</span>
          <small>{world.incoming ? t("Next: {name}", { name: rosterAgent(world.incoming.agentId).name }) : world.running ? t("Live") : t("Watch")}</small>
        </div>
        <div className="squad-log">
          {world.events.slice(0, 10).map((event) => {
            const agent = rosterAgent(event.agentId);
            return (
              <button
                type="button"
                key={event.id}
                className={`log-row${world.selectedId === event.agentId ? " is-lock" : ""}`}
                style={{ ["--agent-accent" as string]: agent.accent }}
                onClick={() => {
                  stageApi?.focusAgent(event.agentId);
                  if (agentWantsVoice(event.agentId)) promoteVoice(event.agentId);
                  else report(event.agentId);
                }}
              >
                <b>{agent.name}</b>
                <span>{line(event.text)}</span>
                <em>{age(event.at, world.now)}</em>
              </button>
            );
          })}
        </div>

        <div className="mini-radar">
          <div className="rail-head">
            <span>{t("Opportunity radar")}</span>
            <small>{world.radar.scanning ? t("Sweeping") : t("Observe only")}</small>
          </div>
          <div className="mini-radar-frame">
            <ActivityScope />
          </div>
          <dl className="mini-radar-readout">
            <div>
              <dt>{t("Open routes")}</dt>
              <dd>{world.radar.routes}</dd>
            </div>
            <div>
              <dt>{t("Decision")}</dt>
              <dd>{world.radar.decision === "—" ? t("None yet") : t(world.radar.decision)}</dd>
            </div>
            <div>
              <dt>{t("Best net")}</dt>
              <dd>{world.radar.bestNet ? `$${world.radar.bestNet.toFixed(2)}` : "—"}</dd>
            </div>
          </dl>
          <p>{world.radar.error ? line(world.radar.error) : line(world.radar.label)}</p>
        </div>
      </aside>

      <BountyDock />
    </div>
  );
}
