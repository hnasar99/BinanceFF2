import {
  EVENT_CAP as EVENT_CAP_RAW,
  OPS_AGENTS as OPS_AGENTS_RAW,
  OPS_PHASES as OPS_PHASES_RAW,
  OVERVIEW_CAP as OVERVIEW_CAP_RAW,
  beginRadarScan as beginRadarScanRaw,
  checksFor as checksForRaw,
  clearLock as clearLockRaw,
  createOpsWorld as createOpsWorldRaw,
  decideGate as decideGateRaw,
  deployMission as deployMissionRaw,
  focusNode as focusNodeRaw,
  ingestRadarScan as ingestRadarScanRaw,
  ingestRadarSim as ingestRadarSimRaw,
  markSettled as markSettledRaw,
  phaseForProgress as phaseForProgressRaw,
  planNext as planNextRaw,
  pulseNetwork as pulseNetworkRaw,
  reportLine as reportLineRaw,
  rosterAgent as rosterAgentRaw,
  sectorFor as sectorForRaw,
  selectAgent as selectAgentRaw,
  setRunning as setRunningRaw,
  tickWorld as tickWorldRaw,
  toggleAssign as toggleAssignRaw,
} from "./ops-sim.mjs";

export type OpsAgentId = "scout" | "analyst" | "commander" | "strategist" | "executor" | "guardian";
export type OpsAgentStatus = "STANDBY" | "READY" | "WORKING" | "BLOCKED";
export type OpsEventKind = "scan" | "analysis" | "command" | "sim" | "exec" | "risk" | "evidence" | "alert";
export type OpsMissionStatus = "active" | "paused" | "verdict" | "settled" | "killed";

export type OpsRosterAgent = {
  id: OpsAgentId;
  name: string;
  role: string;
  accent: string;
  short: string;
  portrait: string;
  level: number;
};

export type OpsCheck = {
  id: string;
  label: string;
  done: boolean;
};

export type OpsAgentState = {
  id: OpsAgentId;
  status: OpsAgentStatus;
  energy: number;
  task: string;
  lastAt: number;
  checks: OpsCheck[];
};

export type OpsIncoming = {
  agentId: string;
  kind: string;
  sector: number;
  text: string;
};

export type OpsEvent = {
  id: string;
  at: number;
  agentId: string;
  kind: string;
  text: string;
  tone: string;
  sector: number;
};

export type OpsMission = {
  id: string;
  title: string;
  reward: string;
  progress: number;
  phaseIndex: number;
  status: OpsMissionStatus;
  startedAt: number;
  txHash?: string;
};

export type OpsGate = {
  kind: "verdict" | "settle";
  label: string;
  prompt: string;
};

export type OpsCompliance = {
  mandate: "NONE" | "ENABLED" | "REVOKED";
  budgetUsed: number;
  budgetMax: number;
  completionPct: number;
  evidence: number;
  policyKills: number;
  disputes: number;
  slaHold: number;
  safe: boolean;
};

export type OpsRadar = {
  scanning: boolean;
  lastAt: number;
  routes: number;
  bestNet: number;
  decision: string;
  label: string;
  error: string;
};

export type OpsWorld = {
  now: number;
  tick: number;
  running: boolean;
  selectedId: string;
  focusedNode: string;
  assigned: string[];
  mission: OpsMission | null;
  gate: OpsGate | null;
  incoming: OpsIncoming | null;
  events: OpsEvent[];
  agents: Record<string, OpsAgentState>;
  compliance: OpsCompliance;
  radar: OpsRadar;
};

export const EVENT_CAP: number = EVENT_CAP_RAW;
export const OVERVIEW_CAP: number = OVERVIEW_CAP_RAW;
export const OPS_PHASES: string[] = OPS_PHASES_RAW;
export const OPS_AGENTS: OpsRosterAgent[] = OPS_AGENTS_RAW as OpsRosterAgent[];

export function createOpsWorld(now?: number): OpsWorld {
  return createOpsWorldRaw(now) as OpsWorld;
}
export function rosterAgent(id: string): OpsRosterAgent {
  return rosterAgentRaw(id) as OpsRosterAgent;
}
export function phaseForProgress(progress: number): number {
  return phaseForProgressRaw(progress);
}
export function selectAgent(world: OpsWorld, id: string): OpsWorld {
  return selectAgentRaw(world, id) as OpsWorld;
}
export function clearLock(world: OpsWorld): OpsWorld {
  return clearLockRaw(world) as OpsWorld;
}
export function checksFor(agentId: string): OpsCheck[] {
  return checksForRaw(agentId) as OpsCheck[];
}
export function sectorFor(agentId: string): number {
  return sectorForRaw(agentId);
}
export function planNext(world: OpsWorld): OpsIncoming | null {
  return planNextRaw(world) as OpsIncoming | null;
}
export function focusNode(world: OpsWorld, nodeName: string): OpsWorld {
  return focusNodeRaw(world, nodeName) as OpsWorld;
}
export function toggleAssign(world: OpsWorld, id: string): OpsWorld {
  return toggleAssignRaw(world, id) as OpsWorld;
}
export function deployMission(world: OpsWorld, title?: string, now?: number): OpsWorld {
  return deployMissionRaw(world, title, now) as OpsWorld;
}
export function setRunning(world: OpsWorld, running: boolean): OpsWorld {
  return setRunningRaw(world, running) as OpsWorld;
}
export function beginRadarScan(world: OpsWorld, now?: number): OpsWorld {
  return beginRadarScanRaw(world, now) as OpsWorld;
}
export function ingestRadarScan(world: OpsWorld, snapshot: Record<string, unknown>, now?: number): OpsWorld {
  return ingestRadarScanRaw(world, snapshot, now) as OpsWorld;
}
export function ingestRadarSim(world: OpsWorld, payload: Record<string, unknown>, now?: number): OpsWorld {
  return ingestRadarSimRaw(world, payload, now) as OpsWorld;
}
export function decideGate(world: OpsWorld, decision: "approve" | "kill", now?: number): OpsWorld {
  return decideGateRaw(world, decision, now) as OpsWorld;
}
export function markSettled(world: OpsWorld, txHash: string, now?: number): OpsWorld {
  return markSettledRaw(world, txHash, now) as OpsWorld;
}
export function pulseNetwork(world: OpsWorld, now?: number): OpsWorld {
  return pulseNetworkRaw(world, now) as OpsWorld;
}
export function tickWorld(world: OpsWorld, now?: number): OpsWorld {
  return tickWorldRaw(world, now) as OpsWorld;
}
export function reportLine(world: OpsWorld, agentId: string): string {
  return reportLineRaw(world, agentId);
}
