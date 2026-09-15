import { OPS_PHASES, rosterAgent, type OpsCheck, type OpsWorld } from "@/lib/ops-sim";

export type TaskRunStatus = "pending" | "running" | "completed" | "failed";

export type MissionDraft = {
  title: string;
  brief: string;
  criteria: string;
  reward: string;
};

export type MissionTaskView = {
  id: string;
  phaseIndex: number;
  title: string;
  agentId: string;
  agentName: string;
  action: string;
  status: TaskRunStatus;
  checksDone: number;
  checksTotal: number;
  hasCheckTelemetry: boolean;
  result: string | null;
  evidence: string[];
  failReason: string | null;
  nextAttempt: string | null;
};

export const PHASE_OWNERS = ["commander", "scout", "strategist", "guardian", "analyst", "executor"] as const;

export const EXAMPLE_MISSION: MissionDraft = {
  title: "Map the safest BNB liquidity routes and seal evidence",
  brief: `Find the safest way to move through BNB liquidity without guessing.

The squad should watch live pools, list the routes that still look viable after fees, test them in simulation, and stop anything that breaks the risk limits. Execution stays blocked until you say otherwise.

Write the outcome in plain language: which route survived, why the others were dropped, and what evidence another person could replay.`,
  criteria: `1. Show the pools and venues that were actually scanned.
2. List at least one candidate route with expected net after fees, gas and slippage.
3. Simulate before any spend is proposed.
4. Reject routes that miss the risk or budget limits, and say why.
5. Seal a result another person can replay.
6. Do not move money without a human signature.`,
  reward: "1,200 USDT",
};

function checksOf(world: OpsWorld, agentId: string): OpsCheck[] {
  return world.agents[agentId]?.checks ?? [];
}

function lastLine(world: OpsWorld, agentId: string, kinds?: string[]) {
  return world.events.find((event) => event.agentId === agentId && (!kinds || kinds.includes(event.kind)))?.text ?? null;
}

function evidenceFor(world: OpsWorld, agentId: string) {
  return world.events
    .filter((event) => event.agentId === agentId && (event.kind === "evidence" || event.kind === "analysis" || event.kind === "sim"))
    .slice(0, 3)
    .map((event) => event.text);
}

function failReason(world: OpsWorld, agentId: string, status: TaskRunStatus) {
  if (status !== "failed") return null;
  return lastLine(world, agentId, ["risk", "alert"]) || world.agents[agentId]?.task || "The step stopped before a verified result.";
}

export function criteriaLines(criteria: string) {
  return criteria
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function deriveMissionTasks(world: OpsWorld): MissionTaskView[] {
  const mission = world.mission;
  const current = mission?.phaseIndex ?? -1;
  const killed = mission?.status === "killed";
  const settled = mission?.status === "settled";

  return OPS_PHASES.map((title, phaseIndex) => {
    const agentId = PHASE_OWNERS[phaseIndex] ?? "commander";
    const agent = rosterAgent(agentId);
    const checks = checksOf(world, agentId);
    const checksDone = checks.filter((item) => item.done).length;
    const agentState = world.agents[agentId];
    const blocked = agentState?.status === "BLOCKED" || /reject|kill|block/i.test(agentState?.task || "");
    let status: TaskRunStatus = "pending";
    if (!mission) status = "pending";
    else if (settled || phaseIndex < current) status = "completed";
    else if (killed && phaseIndex === current) status = "failed";
    else if (killed && phaseIndex > current) status = "pending";
    else if (phaseIndex === current) status = blocked ? "failed" : "running";
    else status = "pending";

    const failed = status === "failed";
    return {
      id: `phase-${phaseIndex}`,
      phaseIndex,
      title,
      agentId,
      agentName: agent.name,
      action: agentState?.task || title,
      status,
      checksDone,
      checksTotal: checks.length,
      hasCheckTelemetry: checks.length > 0,
      result: status === "pending" ? null : lastLine(world, agentId) || agentState?.task || null,
      evidence: status === "pending" ? [] : evidenceFor(world, agentId),
      failReason: failReason(world, agentId, status),
      nextAttempt: failed
        ? killed
          ? "Review the verdict or start a new operation."
          : "The agent will retry this step on the next live tick, or you can ask it to report."
        : null,
    };
  });
}
