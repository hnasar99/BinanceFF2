"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { runtimeSnapshot, type RuntimeSnapshot } from "@/lib/agent-runtime";
import { useSpatialI18n } from "../spatial/i18n-context";

type Value = {
  mode: "runtime" | "demo"; setMode: (v: "runtime" | "demo") => void;
  connected: boolean; checking: boolean; busy: boolean; error: string;
  snapshot: RuntimeSnapshot | null; start: (title: string, brief: string) => Promise<void>;
  view: "world" | "mission" | "agent"; setView: (v: "world" | "mission" | "agent") => void;
};
const Context = createContext<Value | null>(null);
export function useAgentRuntime() { const v = useContext(Context); if (!v) throw new Error("Runtime provider missing"); return v; }
export function AgentRuntimeProvider({ children }: { children: ReactNode }) {
  const { locale } = useSpatialI18n();
  const [mode, setMode] = useState<Value["mode"]>("runtime");
  const [view, setView] = useState<Value["view"]>("mission");
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [connected, setConnected] = useState(false), [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/agent-runtime", { cache: "no-store", signal: ctrl.signal }).then(r => r.json()).then(d => setConnected((d as { connected?: boolean }).connected === true)).catch(() => setConnected(false)).finally(() => setChecking(false));
    return () => ctrl.abort();
  }, []);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/agent-runtime?latest=1", { cache: "no-store", signal: ctrl.signal }).then(async r => {
      if (!r.ok) return;
      const d = await r.json() as { snapshot?: unknown };
      setSnapshot(runtimeSnapshot.parse(d.snapshot));
    }).catch(() => undefined);
    return () => ctrl.abort();
  }, []);
  const missionId = snapshot?.missionId;
  useEffect(() => {
    if (!missionId || mode !== "runtime") return;
    let alive = true;
    const ctrl = new AbortController();
    const poll = async () => {
      try {
        const r = await fetch(`/api/agent-runtime?missionId=${missionId}`, { cache: "no-store", signal: ctrl.signal });
        const d = await r.json() as { error?: string; snapshot?: unknown };
        if (!r.ok) throw new Error(d.error || "Runtime unavailable");
        if (alive) { setSnapshot(runtimeSnapshot.parse(d.snapshot)); setConnected(true); setError(""); }
      } catch (e) { if (alive) { setConnected(false); setError(e instanceof Error ? e.message : "Runtime unavailable"); } }
    };
    // Schedule after completion: no overlapping polls or out-of-order snapshots.
    let timer: ReturnType<typeof setTimeout>;
    const next = async () => { await poll(); if (alive) timer = setTimeout(next, 2000); };
    void next();
    return () => { alive = false; ctrl.abort(); clearTimeout(timer); };
  }, [missionId, mode]);
  const start = async (title: string, brief: string) => {
    if (busy || snapshot?.status === "RUNNING") return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/agent-runtime", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, brief, locale }) });
      const d = await r.json() as { error?: string; snapshot?: unknown };
      if (!r.ok) throw new Error(d.error || "Could not start mission");
      setSnapshot(runtimeSnapshot.parse(d.snapshot)); setConnected(true); setMode("runtime");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not start mission"); }
    finally { setBusy(false); }
  };
  return <Context.Provider value={{ mode, setMode, view, setView, snapshot, connected, checking, busy, error, start }}>{children}</Context.Provider>;
}
