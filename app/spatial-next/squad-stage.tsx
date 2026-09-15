"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { OPS_AGENTS, rosterAgent, type OpsCheck } from "@/lib/ops-sim";
import { useSpatialI18n } from "../spatial/i18n-context";
import { AgentAvatar, type BodyPose, type CameraIntent } from "./agent-avatar";
import { useOps } from "./ops-context";
import { playAuraMusic } from "./aura-audio";

const LIVE_CAP = 2;
type StageView = "list" | "cards" | "single";
type PairLayout = "side" | "frame" | "overlay";

export type SquadStageHandle = {
  focusAgent: (id: string) => void;
  focusBoard: (id: string) => void;
  returnToScene: () => void;
};

function BayBoard({ checks, compact }: { checks: OpsCheck[]; compact?: boolean }) {
  const { line } = useSpatialI18n();
  const items = compact ? checks.slice(0, 3) : checks;
  return (
    <ol className={`bay-board${compact ? " is-compact" : ""}`}>
      {items.map((item) => (
        <li key={item.id} className={item.done ? "is-done" : ""}>
          <span>{item.done ? "✓" : "○"}</span>
          {line(item.label)}
        </li>
      ))}
    </ol>
  );
}

function BodyDock({
  pose,
  onPose,
}: {
  pose: BodyPose;
  onPose: (next: BodyPose) => void;
}) {
  const { t } = useSpatialI18n();
  const actions: Array<{ id: BodyPose; label: string }> = [
    { id: "farmAura", label: t("Farm aura") },
    { id: "operate", label: t("Operate") },
    { id: "point", label: t("Point") },
    { id: "rest", label: t("Rest") },
  ];
  return (
    <div
      className="body-dock"
      role="group"
      aria-label={t("Body control")}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className={pose === action.id ? "is-on" : ""}
          onClick={() => onPose(action.id)}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

function AgentBay({
  agentId,
  live,
  focused,
  compact,
  pointing,
  pairLayout,
  bodyPose,
  auraSession,
  cameraIntent,
  hovered,
  onBodyPose,
  onSelect,
  onFocus,
  onPromote,
  onHoverEnter,
  onHoverLeave,
  onBoardPick,
}: {
  agentId: string;
  live: boolean;
  focused: boolean;
  compact: boolean;
  pointing: boolean;
  pairLayout: PairLayout;
  bodyPose: BodyPose;
  auraSession: number;
  cameraIntent: CameraIntent;
  hovered: boolean;
  onBodyPose: (next: BodyPose) => void;
  onSelect: () => void;
  onFocus: () => void;
  onPromote: () => void;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  onBoardPick: () => void;
}) {
  const { world, speech, audibleId, agentWantsVoice } = useOps();
  const { t, line } = useSpatialI18n();
  const agent = rosterAgent(agentId);
  const state = world.agents[agentId];
  const wanting = agentWantsVoice(agentId);
  const audible = audibleId === agentId;
  const checks = state?.checks ?? [];
  const onMission = Boolean(world.mission && world.assigned.includes(agentId) && world.mission.status !== "killed");
  const headsetOn = onMission || state?.status === "WORKING" || audible || wanting;
  const gesture = bodyPose === "farmAura" || bodyPose === "rest" || bodyPose === "point" || bodyPose === "operate"
    ? bodyPose === "operate" && pointing
      ? "point"
      : bodyPose
    : pointing
      ? "point"
      : "operate";

  return (
    <article
      className={`agent-bay is-${pairLayout}${focused ? " is-focus" : ""}${compact ? " is-compact" : ""}${audible ? " is-live" : ""}`}
      style={{ ["--agent-accent" as string]: agent.accent }}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        if ((event.target as HTMLElement).closest("button")) return;
        event.preventDefault();
        event.stopPropagation();
        onSelect();
      }}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      <div className="bay-viewport">
        {bodyPose === "farmAura" ? <div className="aura-live-badge"><span /> AURA MODE</div> : null}
        <div className="bay-photo">
          <img className="bay-still" src={agent.portrait} alt={t("{name} portrait", { name: agent.name })} />
        </div>
        <div className="bay-double">
          {live ? (
            <AgentAvatar
              agentId={agentId}
              speech={speech}
              speaking={audible && speech?.agentId === agentId}
              variant={compact ? "bay" : "stage"}
              gesture={gesture}
              headset
              headsetLive={headsetOn}
              checks={checks}
              auraSession={auraSession}
              cameraIntent={cameraIntent}
              onBoardPick={onBoardPick}
            />
          ) : (
            <span className="bay-double-wait">{t("3D when in view")}</span>
          )}
        </div>
        {hovered && !focused ? (
          <div className="agent-hover-hint" role="tooltip">
            <b>{agent.name}</b>
            <span>{state?.task ? line(state.task) : t(agent.role)}</span>
          </div>
        ) : null}
        {wanting ? (
          <button
            type="button"
            className={`speak-badge${audible ? " is-air" : " is-want"}`}
            onClick={(event) => {
              event.stopPropagation();
              onPromote();
            }}
          >
            {audible ? t("On air") : t("Wants to speak")}
          </button>
        ) : null}
        {focused ? <BodyDock pose={bodyPose} onPose={onBodyPose} /> : null}
      </div>
      <div className="bay-meta">
        <header>
          <b>{agent.name}</b>
          <small>{t(agent.role)}{headsetOn ? ` · ${t("COMMS")}` : ""}</small>
        </header>
        <BayBoard checks={checks} compact={compact} />
        <p className="bay-task">{state?.task ? line(state.task) : ""}</p>
        {cameraIntent.mode === "board" ? (
          <div className="board-readout" aria-label={t("Blackboard")}>
            <strong>{t("Blackboard")}</strong>
            {(checks.length ? checks : [{ id: "empty", label: t("No execution data"), done: false }]).map((item) => (
              <p key={item.id} className={item.done ? "is-done" : ""}>{item.done ? "✓ " : "○ "}{line(item.label)}</p>
            ))}
          </div>
        ) : null}
        <div className="bay-actions">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onFocus();
            }}
          >
            {t("Open")}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onBoardPick();
            }}
          >
            {t("Read blackboard")}
          </button>
        </div>
      </div>
    </article>
  );
}

const PAIR_KEY = "ops-pair-layout";

function readPairLayout(): PairLayout {
  if (typeof window === "undefined") return "side";
  const saved = window.localStorage.getItem(PAIR_KEY);
  return saved === "frame" || saved === "overlay" || saved === "side" ? saved : "side";
}

export function SquadStage({ onReady }: { onReady?: (api: SquadStageHandle) => void } = {}) {
  const { world, audibleId, select, promoteVoice } = useOps();
  const { t } = useSpatialI18n();
  const [view, setView] = useState<StageView>("cards");
  const [autoFocus, setAutoFocus] = useState(false);
  const [pairLayout, setPairLayout] = useState<PairLayout>(() => readPairLayout());
  const [visible, setVisible] = useState<string[]>(() => OPS_AGENTS.slice(0, LIVE_CAP).map((agent) => agent.id));
  const stripRef = useRef<HTMLDivElement | null>(null);
  const doneRef = useRef<Record<string, number>>({});
  const [pointingId, setPointingId] = useState<string | null>(null);
  const [bodyPoses, setBodyPoses] = useState<Record<string, BodyPose>>({});
  const [auraSessions, setAuraSessions] = useState<Record<string, number>>({});
  const auraTimers = useRef<Record<string, number>>({});
  const auraCooldowns = useRef<Record<string, number>>({});
  const previousMissionStatus = useRef(world.mission?.status);
  const [stripOverflow, setStripOverflow] = useState({ left: false, right: false });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [cameraByAgent, setCameraByAgent] = useState<Record<string, CameraIntent>>({});
  const [sceneLocked, setSceneLocked] = useState(false);

  const choosePair = (mode: PairLayout) => {
    setPairLayout(mode);
    window.localStorage.setItem(PAIR_KEY, mode);
  };

  const squad = useMemo(() => {
    const ids = world.assigned.length ? world.assigned : OPS_AGENTS.map((agent) => agent.id);
    return ids.filter((id) => world.agents[id]);
  }, [world.assigned, world.agents]);
  const singleIndex = (() => {
    const index = squad.indexOf(world.selectedId);
    return index >= 0 ? index : 0;
  })();

  useEffect(() => {
    for (const id of squad) {
      const done = world.agents[id]?.checks.filter((item) => item.done).length ?? 0;
      if (done > (doneRef.current[id] ?? 0)) setPointingId(id);
      doneRef.current[id] = done;
    }
  }, [squad, world.agents]);

  useEffect(() => {
    if (!pointingId) return;
    const timer = window.setTimeout(() => setPointingId(null), 2200);
    return () => window.clearTimeout(timer);
  }, [pointingId]);

  useEffect(() => {
    if (view === "single") return;
    const root = stripRef.current;
    if (!root || typeof IntersectionObserver === "undefined") {
      setVisible(squad.slice(0, LIVE_CAP));
      return;
    }
    const seen = new Map<string, boolean>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.agent;
        if (id) seen.set(id, entry.isIntersecting);
      }
      setVisible(squad.filter((id) => seen.get(id)));
    }, { root, threshold: 0.2 });
    const nodes = root.querySelectorAll<HTMLElement>("[data-agent]");
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [squad, view]);

  const liveIds = useMemo(() => {
    if (view === "single") return new Set([squad[singleIndex]]);
    const ids = new Set<string>();
    if (world.selectedId && squad.includes(world.selectedId)) ids.add(world.selectedId);
    for (const id of visible) {
      if (ids.size >= LIVE_CAP) break;
      ids.add(id);
    }
    return ids;
  }, [view, squad, singleIndex, visible, world.selectedId]);

  useEffect(() => {
    const root = stripRef.current;
    if (view === "single" || !root) {
      setStripOverflow({ left: false, right: false });
      return;
    }
    const slotCount = squad.length;
    const layout = pairLayout;
    const sync = () => {
      void slotCount;
      void layout;
      const max = root.scrollWidth - root.clientWidth;
      setStripOverflow({
        left: root.scrollLeft > 8,
        right: max > 8 && root.scrollLeft < max - 8,
      });
    };
    sync();
    const timer = window.setTimeout(sync, 120);
    root.addEventListener("scroll", sync, { passive: true });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
    observer?.observe(root);
    return () => {
      window.clearTimeout(timer);
      root.removeEventListener("scroll", sync);
      observer?.disconnect();
    };
  }, [view, squad.length, pairLayout]);

  useEffect(() => {
    if (!autoFocus || !audibleId || !squad.includes(audibleId)) return;
    const root = stripRef.current;
    const node = root?.querySelector<HTMLElement>(`[data-agent="${audibleId}"]`);
    node?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [audibleId, autoFocus, squad]);

  const scrollStrip = (dir: -1 | 1) => {
    const root = stripRef.current;
    if (!root) return;
    const slot = root.querySelector<HTMLElement>(".bay-slot");
    const width = slot?.offsetWidth ?? 280;
    root.scrollBy({ left: dir * (width + 8), behavior: "smooth" });
  };

  const setPose = (id: string, next: BodyPose, automatic = false) => {
    if (next === "farmAura") {
      const now = Date.now();
      if (!automatic && (auraCooldowns.current[id] ?? 0) > now) return;
      auraCooldowns.current[id] = now + (automatic ? 120_000 : 150_000);
      window.clearTimeout(auraTimers.current[id]);
      setAuraSessions((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
      void playAuraMusic();
      auraTimers.current[id] = window.setTimeout(() => {
        setBodyPoses((current) => ({ ...current, [id]: "operate" }));
      }, 9000);
    }
    setBodyPoses((current) => ({ ...current, [id]: next }));
  };

  const poseFor = (id: string): BodyPose => bodyPoses[id] ?? "operate";

  useEffect(() => {
    const status = world.mission?.status;
    if (status === "settled" && previousMissionStatus.current !== "settled") {
      const hero = world.assigned.includes("executor") ? "executor" : world.selectedId;
      setView("single");
      select(hero, { takeFloor: false });
      setPose(hero, "farmAura", true);
    }
    previousMissionStatus.current = status;
  }, [select, squad, world.assigned, world.mission?.status, world.selectedId]);

  useEffect(() => () => {
    Object.values(auraTimers.current).forEach((timer) => window.clearTimeout(timer));
  }, []);

  const setCamera = (id: string, mode: CameraIntent["mode"]) => {
    setCameraByAgent((current) => ({
      ...current,
      [id]: { mode, nonce: (current[id]?.nonce ?? 0) + 1 },
    }));
    setSceneLocked(mode !== "home");
  };

  const returnToScene = () => {
    const id = world.selectedId;
    if (id) setCamera(id, "home");
    setView("cards");
    setSceneLocked(false);
  };

  const openSingle = (id: string, camera: CameraIntent["mode"] = "agent") => {
    setView("single");
    select(id, { takeFloor: false });
    setCamera(id, camera);
  };

  const onHoverEnter = (id: string) => {
    setHoverId(id);
  };

  const onHoverLeave = (id: string) => {
    setHoverId((current) => (current === id ? null : current));
  };

  const handlersRef = useRef({ openSingle, returnToScene });
  handlersRef.current = { openSingle, returnToScene };

  const stageHandle = useMemo<SquadStageHandle>(() => ({
    focusAgent: (id) => handlersRef.current.openSingle(id, "agent"),
    focusBoard: (id) => handlersRef.current.openSingle(id, "board"),
    returnToScene: () => handlersRef.current.returnToScene(),
  }), []);

  useEffect(() => {
    onReady?.(stageHandle);
  }, [onReady, stageHandle]);

  useEffect(() => {
    const onHome = () => handlersRef.current.returnToScene();
    window.addEventListener("binanceff-scene-home", onHome);
    return () => window.removeEventListener("binanceff-scene-home", onHome);
  }, []);

  const step = (delta: number) => {
    if (!squad.length) return;
    const next = (singleIndex + delta + squad.length) % squad.length;
    select(squad[next], { takeFloor: false });
    setCamera(squad[next], "agent");
  };

  useEffect(() => {
    if (view !== "single") return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        const next = (singleIndex - 1 + squad.length) % squad.length;
        select(squad[next], { takeFloor: false });
        setCamera(squad[next], "agent");
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        const next = (singleIndex + 1) % squad.length;
        select(squad[next], { takeFloor: false });
        setCamera(squad[next], "agent");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, squad, select, singleIndex]);

  const currentId = squad[singleIndex] ?? squad[0];
  const auraTarget = world.selectedId && squad.includes(world.selectedId) ? world.selectedId : currentId;

  const bay = (id: string, compact: boolean, extra: { live: boolean; focused: boolean }) => (
    <AgentBay
      agentId={id}
      live={extra.live}
      focused={extra.focused}
      compact={compact}
      pointing={poseFor(id) === "operate" && (audibleId === id || pointingId === id)}
      pairLayout={pairLayout}
      bodyPose={poseFor(id)}
      auraSession={auraSessions[id] ?? 0}
      cameraIntent={cameraByAgent[id] ?? { mode: "home", nonce: 0 }}
      hovered={hoverId === id}
      onBodyPose={(next) => setPose(id, next)}
      onSelect={() => openSingle(id, "agent")}
      onFocus={() => openSingle(id, "agent")}
      onPromote={() => {
        select(id);
        promoteVoice(id);
      }}
      onHoverEnter={() => onHoverEnter(id)}
      onHoverLeave={() => onHoverLeave(id)}
      onBoardPick={() => openSingle(id, "board")}
    />
  );

  return (
    <div className={`squad-stage is-${view} is-pair-${pairLayout}`}>
      <div className="view-switch" role="toolbar" aria-label={t("Avatar stage view")}>
        <div className="view-group" role="group" aria-label={t("Stage layout")}>
          {(["list", "cards", "single"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={view === mode}
              className={view === mode ? "is-on" : ""}
              onClick={() => setView(mode)}
            >
              {t(mode === "list" ? "List" : mode === "cards" ? "Cards" : "Single")}
            </button>
          ))}
        </div>
        <div className="view-group" role="group" aria-label={t("Photo and avatar pairing")}>
          {(["side", "frame", "overlay"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={pairLayout === mode}
              className={pairLayout === mode ? "is-on" : ""}
              onClick={() => choosePair(mode)}
            >
              {t(mode === "side" ? "Side" : mode === "frame" ? "Frame" : "Overlay")}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="scene-home"
          onClick={returnToScene}
          disabled={view !== "single" && !sceneLocked}
        >
          {t("Back to the scene")}
        </button>
        <button
          type="button"
          className={`speaker-follow${autoFocus ? " is-on" : ""}`}
          aria-pressed={autoFocus}
          onClick={() => setAutoFocus((current) => !current)}
        >
          <span aria-hidden="true">◉</span> {t("Follow speaker")}
        </button>
        <button
          type="button"
          className={`aura-launch${auraTarget && poseFor(auraTarget) === "farmAura" ? " is-on" : ""}`}
          aria-pressed={Boolean(auraTarget && poseFor(auraTarget) === "farmAura")}
          onClick={() => {
            if (!auraTarget) return;
            select(auraTarget, { takeFloor: false });
            setView("single");
            setPose(auraTarget, "farmAura");
          }}
        >
          ⚡ {t("Farm aura")}
        </button>
        {view === "single" && currentId ? (
          <span className="view-index">{singleIndex + 1} / {squad.length} · {rosterAgent(currentId).name}</span>
        ) : (
          <span className="view-index">{t("{n} agents", { n: squad.length })}</span>
        )}
      </div>

      {view === "single" && currentId ? (
        <div className="squad-single">
          <button type="button" className="file-nav" onClick={() => step(-1)} aria-label={t("Previous agent")}>‹</button>
          {bay(currentId, false, { live: true, focused: true })}
          <button type="button" className="file-nav" onClick={() => step(1)} aria-label={t("Next agent")}>›</button>
        </div>
      ) : (
        <div className={view === "list" ? "bay-strip-wrap" : "bay-cards-host"}>
          {stripOverflow.left ? (
            <button
              type="button"
              className="strip-arrow is-left"
              aria-label={t("More agents")}
              onClick={() => scrollStrip(-1)}
            >
              ‹
            </button>
          ) : null}
          <div className={view === "cards" ? "bay-cards" : "bay-strip"} ref={stripRef}>
            {squad.map((id) => (
              <div key={id} data-agent={id} className="bay-slot">
                {bay(id, true, { live: liveIds.has(id), focused: world.selectedId === id })}
              </div>
            ))}
          </div>
          {stripOverflow.right ? (
            <button
              type="button"
              className="strip-arrow is-right"
              aria-label={t("More agents")}
              onClick={() => scrollStrip(1)}
            >
              ›
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
