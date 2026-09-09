"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { OPS_AGENTS, rosterAgent, type OpsCheck } from "@/lib/ops-sim";
import { useSpatialI18n } from "../spatial/i18n-context";
import { AgentAvatar, type BodyPose } from "./agent-avatar";
import { useOps } from "./ops-context";

const LIVE_CAP = 2;
const HOVER_DWELL_MS = 250;
type StageView = "list" | "cards" | "single";
type PairLayout = "side" | "frame" | "overlay";

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
  onBodyPose,
  onSelect,
  onFocus,
  onPromote,
  onHoverEnter,
  onHoverLeave,
}: {
  agentId: string;
  live: boolean;
  focused: boolean;
  compact: boolean;
  pointing: boolean;
  pairLayout: PairLayout;
  bodyPose: BodyPose;
  onBodyPose: (next: BodyPose) => void;
  onSelect: () => void;
  onFocus: () => void;
  onPromote: () => void;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
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
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        if ((event.target as HTMLElement).closest("button")) return;
        event.preventDefault();
        onSelect();
      }}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      <div className="bay-viewport">
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
            />
          ) : (
            <span className="bay-double-wait">{t("3D when in view")}</span>
          )}
        </div>
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
        {compact ? (
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
          </div>
        ) : null}
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

export function SquadStage() {
  const { world, audibleId, select, promoteVoice, holdVoice, releaseVoice, agentWantsVoice } = useOps();
  const { t } = useSpatialI18n();
  const [view, setView] = useState<StageView>("list");
  const [pairLayout, setPairLayout] = useState<PairLayout>("side");
  const [singleIndex, setSingleIndex] = useState(0);
  const [visible, setVisible] = useState<string[]>(() => OPS_AGENTS.slice(0, LIVE_CAP).map((agent) => agent.id));
  const stripRef = useRef<HTMLDivElement | null>(null);
  const doneRef = useRef<Record<string, number>>({});
  const [pointingId, setPointingId] = useState<string | null>(null);
  const [bodyPoses, setBodyPoses] = useState<Record<string, BodyPose>>({});
  const [stripOverflow, setStripOverflow] = useState({ left: false, right: false });
  const hoverTimer = useRef(0);
  const hoveringId = useRef<string | null>(null);

  useEffect(() => {
    setPairLayout(readPairLayout());
  }, []);

  const choosePair = (mode: PairLayout) => {
    setPairLayout(mode);
    window.localStorage.setItem(PAIR_KEY, mode);
  };

  const squad = useMemo(() => {
    const ids = world.assigned.length ? world.assigned : OPS_AGENTS.map((agent) => agent.id);
    return ids.filter((id) => world.agents[id]);
  }, [world.assigned, world.agents]);

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
    const selected = squad.indexOf(world.selectedId);
    if (selected >= 0) setSingleIndex(selected);
  }, [squad, world.selectedId]);

  useEffect(() => {
    setBodyPoses((current) => {
      const kept = world.selectedId ? current[world.selectedId] : undefined;
      return kept ? { [world.selectedId]: kept } : {};
    });
  }, [world.selectedId]);

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
    }, { root: view === "cards" ? null : root, threshold: 0.2 });
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
    if (view !== "list" || !root) {
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

  const scrollStrip = (dir: -1 | 1) => {
    const root = stripRef.current;
    if (!root) return;
    const slot = root.querySelector<HTMLElement>(".bay-slot");
    const width = slot?.offsetWidth ?? 280;
    root.scrollBy({ left: dir * (width + 8), behavior: "smooth" });
  };

  const setPose = (id: string, next: BodyPose) => {
    setBodyPoses((current) => ({ ...current, [id]: next }));
  };

  const poseFor = (id: string): BodyPose => bodyPoses[id] ?? "operate";

  const onHoverEnter = (id: string) => {
    window.clearTimeout(hoverTimer.current);
    hoveringId.current = id;
    hoverTimer.current = window.setTimeout(() => {
      if (hoveringId.current === id) holdVoice(id);
    }, HOVER_DWELL_MS);
  };

  const onHoverLeave = (id: string) => {
    window.clearTimeout(hoverTimer.current);
    if (hoveringId.current === id) hoveringId.current = null;
    releaseVoice();
  };

  const openSingle = (id: string) => {
    const index = Math.max(0, squad.indexOf(id));
    setSingleIndex(index);
    setView("single");
    select(id);
    if (agentWantsVoice(id)) promoteVoice(id);
  };

  const step = (delta: number) => {
    if (!squad.length) return;
    const next = (singleIndex + delta + squad.length) % squad.length;
    setSingleIndex(next);
    select(squad[next]);
    setBodyPoses((current) => {
      const copy = { ...current };
      delete copy[squad[singleIndex]];
      return copy;
    });
  };

  useEffect(() => {
    if (view !== "single") return;
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSingleIndex((index) => {
          const next = (index - 1 + squad.length) % squad.length;
          select(squad[next]);
          return next;
        });
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setSingleIndex((index) => {
          const next = (index + 1 + squad.length) % squad.length;
          select(squad[next]);
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, squad, select]);

  const currentId = squad[singleIndex] ?? squad[0];

  const bay = (id: string, compact: boolean, extra: { live: boolean; focused: boolean }) => (
    <AgentBay
      agentId={id}
      live={extra.live}
      focused={extra.focused}
      compact={compact}
      pointing={poseFor(id) === "operate" && (audibleId === id || pointingId === id)}
      pairLayout={pairLayout}
      bodyPose={poseFor(id)}
      onBodyPose={(next) => setPose(id, next)}
      onSelect={() => select(id, { takeFloor: false })}
      onFocus={() => (compact ? openSingle(id) : setView("list"))}
      onPromote={() => {
        select(id);
        promoteVoice(id);
      }}
      onHoverEnter={() => onHoverEnter(id)}
      onHoverLeave={() => onHoverLeave(id)}
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
          {view === "list" && stripOverflow.left ? (
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
          {view === "list" && stripOverflow.right ? (
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
