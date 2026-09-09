import assert from "node:assert/strict";
import test from "node:test";
import {
  EVENT_CAP,
  OPS_PHASES,
  beginRadarScan,
  createOpsWorld,
  decideGate,
  deployMission,
  focusNode,
  ingestRadarScan,
  ingestRadarSim,
  markSettled,
  planNext,
  pulseNetwork,
  reportLine,
  sectorFor,
  setRunning,
  tickWorld,
  toggleAssign,
} from "../lib/ops-sim.mjs";

test("idle world already has activity, compliance and standby agents", () => {
  const world = createOpsWorld(1_000);
  assert.equal(world.running, false);
  assert.equal(world.mission, null);
  assert.ok(world.events.length >= 6);
  assert.equal(world.compliance.mandate, "NONE");
  assert.equal(world.agents.scout.status, "STANDBY");
  assert.match(reportLine(world, "scout"), /KAI/);
  assert.match(world.agents.guardian.task, /All parameters are correct/);
});

test("guardian monitor reports a problem when the mandate is unsafe", () => {
  let world = deployMission(createOpsWorld(2_000), "Monitor check", 2_000);
  for (let i = 0; i < 50 && !world.gate; i += 1) world = tickWorld(world, 2_000 + i * 1600);
  world = decideGate(world, "kill", 90_000);
  world = tickWorld(world, 100_000);
  assert.match(world.agents.guardian.task, /problem was detected/);
});

test("deploy starts a live mission and ticking advances progress plus events", () => {
  let world = deployMission(createOpsWorld(2_000), "Map BNB routes", 2_000);
  assert.equal(world.running, true);
  assert.equal(world.mission.status, "active");
  assert.equal(world.compliance.mandate, "ENABLED");
  const before = world.mission.progress;
  world = tickWorld(world, 3_600);
  assert.ok(world.mission.progress > before);
  assert.ok(world.events[0].text.length > 10);
  assert.ok(OPS_PHASES[world.mission.phaseIndex]);
});

test("pause freezes progress; pulse still reports the squad", () => {
  let world = deployMission(createOpsWorld(4_000), "Pause check", 4_000);
  world = setRunning(world, false);
  const frozen = world.mission.progress;
  world = tickWorld(world, 5_600);
  assert.equal(world.mission.progress, frozen);
  world = pulseNetwork(world, 5_700);
  assert.ok(world.events.some((item) => item.tone === "pulse"));
});

test("human verdict can kill or arm settlement", () => {
  let world = deployMission(createOpsWorld(8_000), "Gate", 8_000);
  for (let i = 0; i < 50 && !world.gate; i += 1) world = tickWorld(world, 8_000 + i * 1600);
  assert.equal(world.gate.kind, "verdict");
  const killed = decideGate(world, "kill", 90_000);
  assert.equal(killed.mission.status, "killed");
  assert.equal(killed.compliance.mandate, "REVOKED");
  const armed = decideGate(world, "approve", 90_000);
  assert.equal(armed.gate.kind, "settle");
  const done = markSettled(armed, "0xabc123def456", 91_000);
  assert.equal(done.mission.status, "settled");
  assert.equal(done.compliance.budgetUsed, done.compliance.budgetMax);
});

test("radar ingest updates scout work and risk gate; event log is capped", () => {
  let world = beginRadarScan(createOpsWorld(1), 1);
  assert.equal(world.radar.scanning, true);
  world = ingestRadarScan(world, {
    chainLabel: "BNB Smart Chain",
    opportunities: [{ spreadUsd: 1.25 }, { spreadUsd: 0.4 }],
  }, 2);
  assert.equal(world.radar.routes, 2);
  assert.equal(world.radar.scanning, false);
  world = ingestRadarSim(world, {
    simulation: { netUsd: -12, source: "BSC-RPC" },
    risk: { decision: "KILL", reasons: ["slippage"] },
  }, 3);
  assert.equal(world.radar.decision, "KILL");
  assert.equal(world.compliance.safe, false);
  world = focusNode(world, "RISK ENGINE");
  assert.equal(world.selectedId, "guardian");
  world = toggleAssign(world, "executor");
  assert.equal(world.assigned.includes("executor"), false);
  for (let i = 0; i < 40; i += 1) world = tickWorld(world, 10 + i);
  assert.ok(world.events.length <= EVENT_CAP);
});

test("deploy resets per-agent checklists; ticks mark the next item", () => {
  const idle = createOpsWorld(1_000);
  assert.equal(idle.agents.scout.checks.length, 3);
  assert.ok(idle.agents.scout.checks.every((item) => item.done === false));
  let world = deployMission(idle, "Board check", 2_000);
  assert.ok(world.agents.scout.checks.every((item) => item.done === false));
  const before = world.agents;
  for (let i = 0; i < 12; i += 1) world = tickWorld(world, 3_000 + i * 1600);
  const done = Object.values(world.agents).reduce((sum, agent) => sum + agent.checks.filter((item) => item.done).length, 0);
  assert.ok(done >= 1);
  assert.ok(world.agents.scout.checks !== before.scout.checks);
});

test("events carry sector and tick advertises the next beat", () => {
  const idle = createOpsWorld(1_000);
  assert.equal(typeof idle.events[0].sector, "number");
  assert.equal(sectorFor("guardian"), 5);
  let world = deployMission(createOpsWorld(2_000), "Lookahead", 2_000);
  assert.ok(world.incoming);
  assert.equal(world.incoming.sector, sectorFor(world.incoming.agentId));
  const planned = world.incoming;
  world = tickWorld(world, 3_600);
  assert.equal(world.events[0].agentId, planned.agentId);
  assert.equal(world.events[0].kind, planned.kind);
  assert.equal(world.events[0].sector, planned.sector);
  assert.deepEqual(world.incoming, planNext(world));
});
