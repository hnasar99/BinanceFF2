"use client";

import { useEffect, useMemo, useState } from "react";
import { OPS_PHASES, rosterAgent, type OpsWorld } from "@/lib/ops-sim";
import { languages, translate } from "../spatial/i18n";
import { useSpatialI18n } from "../spatial/i18n-context";
import { ActivityScope } from "./activity-scope";
import { BountyDock } from "./bounty-dock";
import { LangSwitch } from "./lang-switch";
import { SquadStage } from "./squad-stage";
import { useOps } from "./ops-context";

const PHASE_NOW = [
  "The squad is locking the goal and the mandate you just deployed.",
  "Scouts are gathering live BNB liquidity and protocol state.",
  "Strategist is simulating routes. Execute stays blocked.",
  "Guardian is checking budget, selectors and the risk envelope.",
  "Analyst is sealing evidence the oracle can reproduce.",
  "Settlement is ready. Only your wallet can move value.",
];

const DEFAULT_INTENT = "Map the safest BNB liquidity routes and seal evidence";

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

function phaseNoteKey(index: number, phase: number) {
  if (index < phase) return "Verified";
  if (index === phase) return "Happening now";
  return "Comes next";
}

export function OpsHud() {
  const ops = useOps();
  const { locale, t, line } = useSpatialI18n();
  const { world, audibleId, settling, settleError, select, toggle, deploy, pause, resume, scanRadar, decide, settle, report, promoteVoice, agentWantsVoice } = ops;
  const [intent, setIntent] = useState(DEFAULT_INTENT);
  const selected = useMemo(() => rosterAgent(world.selectedId), [world.selectedId]);
  const mission = world.mission;
  const caution = cautionMode(world);
  const phase = mission?.phaseIndex ?? -1;
  const clock = mission ? elapsed(mission.startedAt, world.now) : "00:00";
  const stageLive = Boolean(audibleId);

  useEffect(() => {
    setIntent((current) => {
      const isDefault = current === DEFAULT_INTENT || languages.some((language) => translate(language.id, DEFAULT_INTENT) === current);
      return isDefault ? t(DEFAULT_INTENT) : current;
    });
  }, [t]);

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
        onPrimary: () => deploy(intent),
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
  const objective = world.gate
    ? line(world.gate.prompt)
    : mission
      ? t(PHASE_NOW[Math.max(0, phase)])
      : t("Write an intent, deploy the squad, then follow the mission as each agent reports on stage.");

  return (
    <div className={`cockpit-hud is-${caution}`}>
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
          <LangSwitch />
          <a href="/" className="ms-exit">{t("Exit")}</a>
        </div>
      </header>

      <aside className="mission-rail">
        <div className="rail-head">
          <span>{t("What happens next")}</span>
          <small>{phase >= 0 ? `${phase + 1}/${OPS_PHASES.length}` : "0/6"}</small>
        </div>
        <ol className="phase-list">
          {OPS_PHASES.map((item, index) => (
            <li key={item} className={index < phase ? "is-done" : index === phase ? "is-now" : ""}>
              <em>{index < phase ? "✓" : index + 1}</em>
              <div>
                <b>{t(item)}</b>
                <small>{t(phaseNoteKey(index, phase))}</small>
              </div>
            </li>
          ))}
        </ol>

        <p className="rail-objective">{objective}</p>

        <dl className="rail-stats">
          <div>
            <dt>{t("Mandate")}</dt>
            <dd>{world.compliance.mandate === "NONE" ? t("Not armed") : t(world.compliance.mandate)}</dd>
          </div>
          <div>
            <dt>{t("Evidence seals")}</dt>
            <dd>{t("{n} sealed", { n: world.compliance.evidence })}</dd>
          </div>
          <div>
            <dt>{t("Budget used")}</dt>
            <dd>{world.compliance.budgetUsed} / {world.compliance.budgetMax}</dd>
          </div>
          <div>
            <dt>{t("SLA hold")}</dt>
            <dd>{world.compliance.slaHold}%</dd>
          </div>
        </dl>
        {world.compliance.disputes ? <p className="rail-alert">{t("Dispute open — funds stay locked")}</p> : null}
        {world.compliance.policyKills ? <p className="rail-alert is-soft">{t(world.compliance.policyKills === 1 ? "{n} route killed by policy" : "{n} routes killed by policy", { n: world.compliance.policyKills })}</p> : null}

        {!mission ? (
          <label className="rail-intent">
            {t("Mission intent")}
            <input value={intent} onChange={(event) => setIntent(event.target.value)} />
          </label>
        ) : null}

        <div className="rail-commands">
          <button type="button" className="cmd-primary" disabled={stick.disabled} onClick={stick.onPrimary}>
            <kbd>{stick.primaryHint}</kbd>
            {stick.primary}
          </button>
          <button type="button" className={stick.mode === "gate" ? "cmd-kill" : "cmd-scan"} disabled={stick.disabled && stick.mode !== "gate"} onClick={stick.onSecondary}>
            <kbd>{stick.secondaryHint}</kbd>
            {stick.secondary}
          </button>
          <button type="button" onClick={() => report(selected.id)}>
            {t("Ask {name} to report", { name: selected.name })}
          </button>
          <button type="button" onClick={() => toggle(selected.id)}>
            {world.assigned.includes(selected.id) ? t("Stand down {name}", { name: selected.name }) : t("Assign {name}", { name: selected.name })}
          </button>
        </div>
        <p className="rail-hint">{t("You remain in control. Agents may read, test and recommend. They cannot move money without you.")}</p>
      </aside>

      <section className={`mission-stage${stageLive ? " is-live" : ""}${world.gate ? " is-gate" : ""}`} style={{ ["--agent-accent" as string]: selected.accent }}>
        <SquadStage />
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
                  select(event.agentId);
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
