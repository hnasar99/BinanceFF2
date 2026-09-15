"use client";

import { useMemo, useState } from "react";
import { OPS_PHASES, rosterAgent } from "@/lib/ops-sim";
import { useSpatialI18n } from "../spatial/i18n-context";
import { useOps } from "./ops-context";
import {
  EXAMPLE_MISSION,
  criteriaLines,
  deriveMissionTasks,
  type MissionDraft,
  type MissionTaskView,
  type TaskRunStatus,
} from "./mission-model";

function GlossaryTip({ term, meaning }: { term: string; meaning: string }) {
  return (
    <abbr className="ops-tip" title={meaning} aria-label={`${term}: ${meaning}`}>
      {term}
      <span aria-hidden="true">?</span>
    </abbr>
  );
}

function statusLabel(status: TaskRunStatus, t: (value: string) => string) {
  if (status === "running") return t("In progress");
  if (status === "completed") return t("Completed");
  if (status === "failed") return t("Failed");
  return t("Pending");
}

function TaskCard({
  task,
  active,
  onOpenAgent,
}: {
  task: MissionTaskView;
  active: boolean;
  onOpenAgent: (id: string) => void;
}) {
  const { t, line } = useSpatialI18n();
  const agent = rosterAgent(task.agentId);
  return (
    <li className={`task-card is-${task.status}${active ? " is-now" : ""}`}>
      <header>
        <em aria-hidden="true">{task.status === "completed" ? "✓" : task.phaseIndex + 1}</em>
        <div>
          <b>{t(task.title)}</b>
          <small className={`task-state is-${task.status}`}>{statusLabel(task.status, t)}</small>
        </div>
      </header>
      <dl>
        <div>
          <dt>{t("Responsible")}</dt>
          <dd>
            <button type="button" className="task-agent" onClick={() => onOpenAgent(task.agentId)} style={{ ["--agent-accent" as string]: agent.accent }}>
              {task.agentName}
              <small>{t(agent.role)}</small>
            </button>
          </dd>
        </div>
        <div>
          <dt>{t("Action")}</dt>
          <dd>{task.action ? line(task.action) : t(task.title)}</dd>
        </div>
        <div>
          <dt>{t("Progress")}</dt>
          <dd>
            {task.hasCheckTelemetry
              ? t("Checks {done}/{total}", { done: task.checksDone, total: task.checksTotal })
              : t("No execution data")}
          </dd>
        </div>
        <div>
          <dt>{t("Result")}</dt>
          <dd>{task.result ? line(task.result) : t("No execution data")}</dd>
        </div>
        <div>
          <dt>{t("Evidence")}</dt>
          <dd>
            {task.evidence.length
              ? (
                  <ul>
                    {task.evidence.map((item) => <li key={item}>{line(item)}</li>)}
                  </ul>
                )
              : t("No evidence yet")}
          </dd>
        </div>
        {task.status === "failed" ? (
          <>
            <div>
              <dt>{t("Why it failed")}</dt>
              <dd>{task.failReason ? line(task.failReason) : t("No execution data")}</dd>
            </div>
            <div>
              <dt>{t("Next attempt")}</dt>
              <dd>{task.nextAttempt ? t(task.nextAttempt) : t("No execution data")}</dd>
            </div>
          </>
        ) : null}
      </dl>
    </li>
  );
}

function BountyEditor({
  draft,
  onChange,
  onExample,
  onDeploy,
  highlight,
}: {
  draft: MissionDraft;
  onChange: (next: MissionDraft) => void;
  onExample: () => void;
  onDeploy: () => void;
  highlight?: boolean;
}) {
  const { t } = useSpatialI18n();
  return (
    <form
      className={`bounty-editor${highlight ? " is-tour" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        onDeploy();
      }}
    >
      <header>
        <strong>{t("Write a longer bounty")}</strong>
        <p>{t("Use a full brief. The text is not cut off here.")}</p>
      </header>
      <label>
        {t("Title")}
        <input
          value={draft.title}
          onChange={(event) => onChange({ ...draft, title: event.target.value })}
          aria-required="true"
        />
      </label>
      <label>
        {t("Mission brief")}
        <textarea
          value={draft.brief}
          onChange={(event) => onChange({ ...draft, brief: event.target.value })}
          rows={8}
        />
      </label>
      <label>
        {t("Success criteria")}
        <textarea
          value={draft.criteria}
          onChange={(event) => onChange({ ...draft, criteria: event.target.value })}
          rows={7}
        />
      </label>
      <label>
        {t("Reward")}
        <input
          value={draft.reward}
          onChange={(event) => onChange({ ...draft, reward: event.target.value })}
        />
      </label>
      <div className="bounty-editor-actions">
        <button type="button" onClick={onExample}>{t("Use example mission")}</button>
        <button type="submit" className="mission-launch-button">
          <span aria-hidden="true">▶</span>
          <span>
            <b>{t("Start this mission")}</b>
            <small>{t("Brief and activate the squad")}</small>
          </span>
        </button>
      </div>
    </form>
  );
}

export function MissionPanel({
  stick,
  tourStep,
  onOpenAgent,
  onOpenBoard,
}: {
  stick: {
    mode: "gate" | "deploy" | "live";
    primary: string;
    primaryHint: string;
    onPrimary: () => void;
    secondary: string;
    secondaryHint: string;
    onSecondary: () => void;
    disabled: boolean;
  };
  tourStep: number | null;
  onOpenAgent: (id: string) => void;
  onOpenBoard: (id: string) => void;
}) {
  const ops = useOps();
  const { world, select, toggle, report, deploy } = ops;
  const { t, line } = useSpatialI18n();
  const selected = useMemo(() => rosterAgent(world.selectedId), [world.selectedId]);
  const mission = world.mission;
  const tasks = useMemo(() => deriveMissionTasks(world), [world]);
  const selectedState = world.agents[selected.id];
  const localizedExample = useMemo<MissionDraft>(() => ({
    title: t(EXAMPLE_MISSION.title),
    brief: t(EXAMPLE_MISSION.brief),
    criteria: t(EXAMPLE_MISSION.criteria),
    reward: EXAMPLE_MISSION.reward,
  }), [t]);
  const [customDraft, setCustomDraft] = useState<MissionDraft | null>(null);
  const draft = customDraft ?? localizedExample;
  const phase = mission?.phaseIndex ?? -1;
  const objective = world.gate
    ? line(world.gate.prompt)
    : mission
      ? t("Now: {phase}", { phase: t(OPS_PHASES[Math.max(0, phase)]) })
      : t("Write an intent, deploy the squad, then follow the mission as each agent reports on stage.");

  const launch = () => {
    const title = draft.title.trim();
    deploy(title, {
      brief: draft.brief.trim(),
      criteria: draft.criteria.trim(),
      reward: draft.reward.trim(),
    });
  };

  return (
    <aside className={`mission-rail${tourStep === 0 ? " is-tour" : ""}`} aria-label={t("Mission panel")}>
      <div className="rail-head">
        <span>{t("Your mission")}</span>
        <small>{phase >= 0 ? `${phase + 1}/${OPS_PHASES.length}` : "0/6"}</small>
      </div>

      <p className="rail-glossary">
        <GlossaryTip term={t("Bounty")} meaning={t("A bounty is a paid job with a written goal and a reward.")} />
        <GlossaryTip term={t("Blackboard")} meaning={t("The blackboard is this agent's task list. You can also read it as text.")} />
        <GlossaryTip term={t("Deploy")} meaning={t("Deploy starts the squad. They cannot move money without you.")} />
      </p>

      {!mission ? (
        <BountyEditor
          draft={draft}
          onChange={(next) => setCustomDraft(next)}
          onExample={() => setCustomDraft(null)}
          onDeploy={launch}
          highlight={tourStep === 0}
        />
      ) : (
        <article className="mission-brief-card">
          <span>{world.running ? t("Mission executing") : t("Mission on hold")}</span>
          <h2>{line(mission.title)}</h2>
          <p className="mission-reward">{mission.reward}</p>
          <section>
            <h3>{t("Mission brief")}</h3>
            <p>{mission.brief ? line(mission.brief) : t("No brief yet. Add one before you deploy, or use the example mission.")}</p>
          </section>
          <section>
            <h3>{t("Success criteria")}</h3>
            {mission.criteria ? (
              <ul>
                {criteriaLines(line(mission.criteria)).map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
              </ul>
            ) : (
              <p>{t("No criteria yet. Add how you will know this worked.")}</p>
            )}
          </section>
        </article>
      )}

      <div className={`task-block${tourStep === 1 ? " is-tour" : ""}`}>
        <div className="rail-head">
          <span>{t("Task sequence")}</span>
          <small>{t("See who does each task")}</small>
        </div>
        <ol className="task-list">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              active={task.phaseIndex === phase}
              onOpenAgent={onOpenAgent}
            />
          ))}
        </ol>
      </div>

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

      <section className={`board-panel${tourStep === 2 ? " is-tour" : ""}`} aria-label={t("Blackboard")}>
        <div className="rail-head">
          <span>{t("Blackboard")} · {selected.name}</span>
          <button type="button" className="board-open" onClick={() => onOpenBoard(selected.id)}>
            {t("Read blackboard")}
          </button>
        </div>
        <p className="board-task">{selectedState?.task ? line(selectedState.task) : t("No execution data")}</p>
        <ol className="bay-board">
          {(selectedState?.checks ?? []).map((item) => (
            <li key={item.id} className={item.done ? "is-done" : ""}>
              <span>{item.done ? "✓" : "○"}</span>
              {line(item.label)}
            </li>
          ))}
        </ol>
        {!selectedState?.checks.length ? <p>{t("No execution data")}</p> : null}
      </section>

      <div className="rail-commands">
        {mission ? (
          <button type="button" className="cmd-primary" disabled={stick.disabled} onClick={stick.onPrimary}>
            <kbd>{stick.primaryHint}</kbd>
            {stick.primary}
          </button>
        ) : null}
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
        <button type="button" onClick={() => onOpenAgent(selected.id)}>
          {t("Open")} {selected.name}
        </button>
      </div>
      <p className="rail-hint">{t("You remain in control. Agents may read, test and recommend. They cannot move money without you.")}</p>
    </aside>
  );
}
