import type { OpsWorld } from "./ops-sim";
import type { RuntimeSnapshot } from "./agent-runtime";

// Projection only: no fabricated progress, trade outcome or economic authority.
export function projectRuntime(world: OpsWorld, snapshot: RuntimeSnapshot | null): OpsWorld {
  if (!snapshot) return { ...world, mission: null, running: false, events: [], incoming: null, gate: null, compliance: { ...world.compliance, mandate: "NONE", budgetUsed: 0, completionPct: 0, evidence: 0, safe: false },
    agents: Object.fromEntries(Object.entries(world.agents).map(([id, a]) => [id, { ...a, status: "STANDBY", task: "Runtime offline or awaiting mission", checks: [] }])) };
  const done = snapshot.agents.filter(a => a.status === "COMPLETED").length;
  const phase = Math.max(0, snapshot.agents.findIndex(a => a.status !== "COMPLETED"));
  return {
    ...world, now: Date.now(), running: snapshot.status === "RUNNING", incoming: null, gate: null,
    assigned: snapshot.agents.map(a => a.id),
    mission: { id: snapshot.missionId, title: snapshot.title, brief: snapshot.brief, criteria: "Agent replies are analysis, not verified market evidence", reward: "No spend", phaseIndex: done === 6 ? 5 : phase, progress: Math.round(done / 6 * 100), status: "paused", startedAt: snapshot.startedAt },
    agents: Object.fromEntries(snapshot.agents.map(a => [a.id, { ...world.agents[a.id], id: a.id, status: a.status === "THINKING" ? "WORKING" : a.status === "ERROR" || a.status === "BLOCKED" ? "BLOCKED" : a.status === "COMPLETED" ? "READY" : "STANDBY", task: a.reply || a.objective, checks: [], lastAt: snapshot.events.filter(e => e.agentId === a.id).at(-1)?.at || snapshot.startedAt }])),
    events: snapshot.events.slice().reverse().map(e => ({ id: e.id, at: e.at, agentId: e.agentId, text: e.text, kind: e.kind === "error" ? "alert" : "analysis", tone: e.kind === "error" ? "risk" : "live", sector: 0 })),
    compliance: { ...world.compliance, mandate: "NONE", budgetUsed: 0, completionPct: Math.round(done / 6 * 100), evidence: 0, safe: false },
  };
}
