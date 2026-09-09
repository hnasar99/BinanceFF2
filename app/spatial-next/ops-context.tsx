"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEPLOY_LINE } from "@/lib/agent-voice";
import {
  beginRadarScan,
  clearLock,
  createOpsWorld,
  decideGate,
  deployMission,
  focusNode,
  ingestRadarScan,
  ingestRadarSim,
  markSettled,
  pulseNetwork,
  reportLine,
  selectAgent,
  setRunning,
  tickWorld,
  toggleAssign,
  type OpsWorld,
} from "@/lib/ops-sim";
import {
  audibleId as queueAudibleId,
  createVoiceQueue,
  enqueue,
  finish,
  holdFloor,
  isWanting,
  promote,
  releaseFloor,
  wantingIds,
  type VoiceQueue,
} from "@/lib/voice-queue";
import { useSpatialI18n } from "../spatial/i18n-context";
import { pauseAgentSpeech, playAgentSpeech, resumeAgentSpeech, stopAgentSpeech, stopHoverSpeech, type VoicePlayMeta } from "./agent-speaker";
import type { SpeechCue } from "./agent-avatar";

type OpsContextValue = {
  world: OpsWorld;
  speech: SpeechCue | null;
  voiceMeta: VoicePlayMeta | null;
  voiceBusy: boolean;
  audibleId: string | null;
  wanting: string[];
  settling: boolean;
  settleError: string;
  select: (id: string, opts?: { takeFloor?: boolean }) => void;
  toggle: (id: string) => void;
  deploy: (title: string) => void;
  pause: () => void;
  resume: () => void;
  pulse: () => void;
  scanRadar: () => void;
  decide: (decision: "approve" | "kill") => void;
  settle: () => void;
  report: (id?: string) => void;
  unlock: () => void;
  promoteVoice: (id: string) => void;
  holdVoice: (id: string) => void;
  releaseVoice: () => void;
  agentWantsVoice: (id: string) => boolean;
};

const OpsContext = createContext<OpsContextValue | null>(null);

export function useOps() {
  const value = useContext(OpsContext);
  if (!value) throw new Error("useOps must be inside OpsProvider");
  return value;
}

export function OpsProvider({ children }: { children: ReactNode }) {
  const { locale, line } = useSpatialI18n();
  const [world, setWorld] = useState<OpsWorld>(() => createOpsWorld(Date.now()));
  const [queue, setQueue] = useState<VoiceQueue>(() => createVoiceQueue());
  const [speech, setSpeech] = useState<SpeechCue | null>(null);
  const [voiceMeta, setVoiceMeta] = useState<VoicePlayMeta | null>(null);
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState("");
  const worldRef = useRef(world);
  worldRef.current = world;
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const playGen = useRef(0);
  const lastEventIdRef = useRef("");
  const lastGateKeyRef = useRef("");
  const skipBootBriefRef = useRef(true);
  const apiRef = useRef({
    pause: () => {},
    resume: () => {},
    scanRadar: () => {},
    decide: (_d: "approve" | "kill") => {},
    settle: () => {},
    report: (_id?: string) => {},
    select: (_id: string) => {},
    unlock: () => {},
    promoteVoice: (_id: string) => {},
    holdVoice: (_id: string) => {},
    releaseVoice: () => {},
  });

  const enqueueLine = useCallback((agentId: string, text: string) => {
    setQueue((current) => enqueue(current, agentId, text));
  }, []);

  const promoteVoice = useCallback((agentId: string) => {
    setWorld((current) => (current.selectedId === agentId ? current : selectAgent(current, agentId)));
    setQueue((current) => {
      const next = promote(current, agentId);
      if (next.audible?.id !== current.audible?.id) {
        stopAgentSpeech();
        playGen.current += 1;
      }
      return next;
    });
  }, []);

  const floorHeldRef = useRef(false);
  const holdResumeRef = useRef(false);

  const holdVoice = useCallback((agentId: string) => {
    const current = queueRef.current;
    if (current.audible?.agentId === agentId) return;
    const pending = current.items.find((item) => item.agentId === agentId);
    const text = pending?.text || reportLine(worldRef.current, agentId);
    if (!text) return;
    floorHeldRef.current = true;
    pauseAgentSpeech();
    playGen.current += 1;
    setQueue((queue) => holdFloor(queue, agentId, text));
  }, []);

  const releaseVoice = useCallback(() => {
    if (!floorHeldRef.current) return;
    floorHeldRef.current = false;
    const current = queueRef.current;
    if (current.held) {
      stopHoverSpeech();
      playGen.current += 1;
      holdResumeRef.current = true;
      setQueue((queue) => releaseFloor(queue));
      return;
    }
    stopHoverSpeech();
    playGen.current += 1;
    setQueue((queue) => releaseFloor(queue));
  }, []);

  useEffect(() => () => stopAgentSpeech(), []);

  const audibleKey = queue.audible?.id ?? "";

  useEffect(() => {
    const item = queueRef.current.audible;
    if (!item || item.id !== audibleKey) {
      if (!audibleKey) setSpeech(null);
      return;
    }
    const gen = ++playGen.current;
    const cueId = Date.now();
    const spoken = line(item.text);
    const lang = locale;
    setSpeech({ id: cueId, agentId: item.agentId, text: spoken });
    const onDone = () => {
      if (gen !== playGen.current) return;
      setQueue((current) => {
        if (current.audible?.id !== item.id) return current;
        const next = finish(current);
        if (current.held) holdResumeRef.current = true;
        return next;
      });
    };
    if (holdResumeRef.current) {
      holdResumeRef.current = false;
      void resumeAgentSpeech().then((ok) => {
        if (gen !== playGen.current) return;
        if (ok) {
          onDone();
          return;
        }
        void playAgentSpeech(item.agentId, spoken, (meta) => {
          if (gen !== playGen.current) return;
          setVoiceMeta(meta);
          setSpeech((current) => (current?.id === cueId ? { ...current, durationMs: meta.durationMs } : current));
        }, lang).finally(onDone);
      });
      return;
    }
    void playAgentSpeech(item.agentId, spoken, (meta) => {
      if (gen !== playGen.current) return;
      setVoiceMeta(meta);
      setSpeech((current) => (current?.id === cueId ? { ...current, durationMs: meta.durationMs } : current));
    }, lang).finally(onDone);
  }, [audibleKey, locale, line]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setWorld((current) => tickWorld(current, Date.now()));
    }, 1600);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (skipBootBriefRef.current) {
      skipBootBriefRef.current = false;
      lastEventIdRef.current = world.events[0]?.id ?? "";
      return;
    }
    const gate = world.gate;
    const gateKey = gate ? `${gate.kind}:${gate.prompt}` : "";
    if (gate && gateKey !== lastGateKeyRef.current) {
      lastGateKeyRef.current = gateKey;
      enqueueLine(gate.kind === "settle" ? "executor" : "guardian", gate.prompt);
      return;
    }
    if (!gate) lastGateKeyRef.current = "";
    if (!world.running || gate) return;
    const latest = world.events[0];
    if (!latest || latest.tone === "idle") return;
    if (latest.id === lastEventIdRef.current) return;
    lastEventIdRef.current = latest.id;
    enqueueLine(latest.agentId, latest.text);
  }, [enqueueLine, world.events, world.gate, world.running]);

  useEffect(() => {
    const onFocus = (event: Event) => {
      const node = (event as CustomEvent<{ node?: string }>).detail?.node;
      if (!node) return;
      setWorld((current) => focusNode(current, node));
    };
    window.addEventListener("binanceff-ops-focus", onFocus);
    return () => window.removeEventListener("binanceff-ops-focus", onFocus);
  }, []);

  const audible = queueAudibleId(queue);
  const wanting = wantingIds(queue);

  const value = useMemo<OpsContextValue>(() => ({
    world,
    speech,
    voiceMeta,
    voiceBusy: Boolean(queue.audible),
    audibleId: audible,
    wanting,
    settling,
    settleError,
    select: (id, opts) => {
      setWorld((current) => selectAgent(current, id));
      if (opts?.takeFloor === false) return;
      if (isWanting(queueRef.current, id) && queueAudibleId(queueRef.current) !== id) {
        stopAgentSpeech();
        playGen.current += 1;
        setQueue((current) => promote(current, id));
      }
    },
    toggle: (id) => setWorld((current) => toggleAssign(current, id)),
    deploy: (title) => {
      setSettleError("");
      setWorld((current) => deployMission(current, title, Date.now()));
      enqueueLine("commander", DEPLOY_LINE);
    },
    pause: () => setWorld((current) => setRunning(current, false)),
    resume: () => setWorld((current) => setRunning(current, true)),
    pulse: () => setWorld((current) => pulseNetwork(current, Date.now())),
    scanRadar: () => {
      setWorld((current) => beginRadarScan(current, Date.now()));
      void (async () => {
        try {
          const scan = await fetch("/api/radar?chain=bnb-smart-chain&notionalUsd=2000", { cache: "no-store" });
          const data = (await scan.json()) as Record<string, unknown> & { opportunities?: Array<{ publicCode: string; spreadUsd: number }>; error?: string };
          setWorld((current) => ingestRadarScan(current, data, Date.now()));
          const routes = data.opportunities?.length ?? 0;
          const first = data.opportunities?.[0];
          if (first?.publicCode && !data.error) {
            enqueueLine("scout", `Radar live. ${routes} open routes on BNB Smart Chain. Execute remains blocked.`);
            const sim = await fetch("/api/radar", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ action: "simulate", chain: "bnb-smart-chain", publicCode: first.publicCode, notionalUsd: 2000 }),
            });
            const payload = (await sim.json()) as Record<string, unknown> & { risk?: { decision?: string }; simulation?: { netUsd?: number } };
            setWorld((current) => ingestRadarSim(current, payload, Date.now()));
            const decision = payload.risk?.decision;
            const net = Number(payload.simulation?.netUsd) || 0;
            enqueueLine(decision === "KILL" ? "guardian" : "strategist", decision === "KILL"
              ? "Risk gate kill. The simulated edge does not clear policy."
              : `Simulation net ${net.toFixed(2)} dollars. Observe only.`);
          } else {
            enqueueLine("scout", data.error ? `Radar scan failed. ${data.error}` : "No live routes on this sweep.");
          }
        } catch (reason) {
          setWorld((current) => ingestRadarScan(current, { error: reason instanceof Error ? reason.message : "Radar offline", opportunities: [] }, Date.now()));
        }
      })();
    },
    decide: (decision) => {
      setWorld((current) => decideGate(current, decision, Date.now()));
      enqueueLine(decision === "kill" ? "guardian" : "analyst", decision === "kill"
        ? "Route killed. Mandate spend untouched."
        : "Evidence accepted. Settlement is armed.");
    },
    settle: () => {
      const mission = worldRef.current.mission;
      if (!mission) return;
      setSettling(true);
      setSettleError("");
      void import("@/lib/wallet-client").then(async ({ settleOnChain }) => {
        try {
          const hash = await settleOnChain(mission.id);
          setWorld((current) => markSettled(current, hash, Date.now()));
          enqueueLine("executor", "Settlement receipt is on chain.");
        } catch (reason) {
          setSettleError(reason instanceof Error ? reason.message : "Settlement rejected");
        } finally {
          setSettling(false);
        }
      });
    },
    report: (id) => {
      const agentId = id || worldRef.current.selectedId;
      const line = reportLine(worldRef.current, agentId);
      setWorld((current) => selectAgent(current, agentId));
      setQueue((current) => {
        const next = promote(enqueue(current, agentId, line), agentId);
        if (next.audible?.id !== current.audible?.id) {
          stopAgentSpeech();
          playGen.current += 1;
        }
        return next;
      });
    },
    unlock: () => setWorld((current) => clearLock(current)),
    promoteVoice,
    holdVoice,
    releaseVoice,
    agentWantsVoice: (id) => isWanting(queue, id),
  }), [audible, enqueueLine, holdVoice, promoteVoice, queue, releaseVoice, settleError, settling, speech, voiceMeta, wanting, world]);

  apiRef.current = {
    pause: value.pause,
    resume: value.resume,
    scanRadar: value.scanRadar,
    decide: value.decide,
    settle: value.settle,
    report: value.report,
    select: value.select,
    unlock: value.unlock,
    promoteVoice: value.promoteVoice,
    holdVoice: value.holdVoice,
    releaseVoice: value.releaseVoice,
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const api = apiRef.current;
      const current = worldRef.current;
      if (event.code === "Space") {
        event.preventDefault();
        if (!current.mission || current.gate || current.mission.status === "settled" || current.mission.status === "killed") return;
        if (current.running) api.pause();
        else api.resume();
        return;
      }
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        api.scanRadar();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        api.report();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        api.unlock();
        return;
      }
      if ((event.key === "a" || event.key === "A") && current.gate) {
        event.preventDefault();
        if (current.gate.kind === "settle") api.settle();
        else api.decide("approve");
        return;
      }
      if ((event.key === "k" || event.key === "K") && current.gate) {
        event.preventDefault();
        api.decide("kill");
        return;
      }
      const slot = Number(event.key);
      if (slot >= 1 && slot <= 6) {
        event.preventDefault();
        const agent = ["scout", "analyst", "commander", "strategist", "executor", "guardian"][slot - 1];
        api.select(agent);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>;
}
