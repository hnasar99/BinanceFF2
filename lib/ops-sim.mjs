export const OPS_PHASES = [
  "Goal agreed",
  "Information gathered",
  "Options tested",
  "Risks checked",
  "Result verified",
  "Payment ready",
];

export const OPS_AGENTS = [
  { id: "scout", name: "KAI", role: "SCOUT", accent: "#40d7ff", short: "Explore · Discover · Alert", portrait: "/agents/kai.png", level: 18 },
  { id: "analyst", name: "LYRA", role: "ANALYST", accent: "#a78bfa", short: "Decode · Research · Score", portrait: "/agents/lyra.png", level: 24 },
  { id: "commander", name: "ORION", role: "COMMANDER", accent: "#f3ba2f", short: "Orchestrate · Adapt · Evolve", portrait: "/agents/orion.png", level: 32 },
  { id: "strategist", name: "NOVA", role: "STRATEGIST", accent: "#8f7cff", short: "Plan · Simulate · Optimize", portrait: "/agents/nova.png", level: 21 },
  { id: "executor", name: "REX", role: "EXECUTOR", accent: "#ff5151", short: "Trade · Deploy · Settle", portrait: "/agents/rex.png", level: 27 },
  { id: "guardian", name: "AEGIS", role: "GUARDIAN", accent: "#50e3a4", short: "Protect · Monitor · Balance", portrait: "/agents/aegis.png", level: 19 },
];

const WORK = {
  scout: [
    ["scan", "Indexed 18 BNB liquidity pools on PancakeSwap and THENA"],
    ["scan", "Camelot/WETH imbalance flagged on Arbitrum"],
    ["alert", "Mempool drift on Base exceeded watch threshold"],
  ],
  analyst: [
    ["analysis", "Spread survives fees only below $28,000 notional"],
    ["analysis", "THENA stable pool depth covers the proposed size"],
    ["analysis", "Cross-venue latency window is 1.8s — inside SLA"],
  ],
  commander: [
    ["command", "Rebalanced squad: Scout leads, Guardian gates spend"],
    ["command", "Milestone 2 opened — simulation before any spend"],
    ["command", "Holding execution until evidence is sealed"],
  ],
  strategist: [
    ["sim", "Route USDC→WETH Camelot, exit Uniswap — net +$42 simulated"],
    ["sim", "Adverse slippage case still clears the risk floor"],
    ["sim", "Bridge path discarded: latency kills the edge"],
  ],
  executor: [
    ["exec", "Nonce reserved. Execution engine standing by"],
    ["exec", "Settlement memo drafted — 0-value until human sign"],
    ["exec", "Automatic execute remains blocked by mandate"],
  ],
  guardian: [
    ["risk", "Rejected 2 routes outside mandate risk envelope"],
    ["risk", "Budget, selector and expiry remain compliant"],
    ["risk", "No spend authority granted — read/simulate/propose only"],
  ],
};

const AMBIENT = [
  ["scout", "scan", "Watching BNB Smart Chain reserves"],
  ["analyst", "analysis", "Refreshing protocol risk scores"],
  ["guardian", "risk", "Monitoring agent active. All parameters are correct."],
  ["strategist", "sim", "Idle simulation grid warm"],
  ["executor", "exec", "No unsigned spend in the queue"],
  ["commander", "command", "Network topology stable — 6 agents online"],
];

export const AGENT_SECTOR = {
  scout: 0,
  analyst: 1,
  commander: 2,
  strategist: 3,
  executor: 4,
  guardian: 5,
};

export const EVENT_CAP = 28;
export const OVERVIEW_CAP = 8;

export function sectorFor(agentId) {
  return AGENT_SECTOR[agentId] ?? 2;
}

export function checksFor(agentId) {
  const work = WORK[agentId] || WORK.commander;
  return work.map(([, label], index) => ({
    id: `${agentId}-${index}`,
    label,
    done: false,
  }));
}

function cloneChecks(checks) {
  return (checks || []).map((item) => ({ ...item }));
}

function completeNextCheck(agent) {
  if (!agent?.checks) return false;
  const next = agent.checks.find((item) => !item.done);
  if (!next) return false;
  next.done = true;
  return true;
}

function clone(world) {
  return {
    ...world,
    assigned: [...world.assigned],
    agents: Object.fromEntries(Object.entries(world.agents).map(([id, agent]) => [id, { ...agent, checks: cloneChecks(agent.checks) }])),
    events: [...world.events],
    compliance: { ...world.compliance },
    radar: { ...world.radar },
    mission: world.mission ? { ...world.mission } : null,
    gate: world.gate ? { ...world.gate } : null,
    incoming: world.incoming ? { ...world.incoming } : null,
  };
}

const NODE_FOCUS = {
  "MASTER AGENT": "commander",
  ARBITRUM: "scout",
  "BNB CHAIN": "scout",
  BASE: "strategist",
  "RISK ENGINE": "guardian",
};

function pick(list, tick, salt = 0) {
  return list[Math.abs((tick + salt) * 17) % list.length];
}

function hasMonitorProblem(world) {
  return Boolean(
    world?.mission?.status === "killed" ||
    world?.compliance?.mandate === "REVOKED" ||
    world?.compliance?.safe === false ||
    world?.radar?.decision === "KILL" ||
    world?.radar?.error ||
    world?.agents?.guardian?.status === "BLOCKED",
  );
}

function monitorLine(world) {
  return hasMonitorProblem(world)
    ? "Monitoring agent active. A problem was detected. Review the parameters."
    : "Monitoring agent active. All parameters are correct.";
}

function ambientRow(world, tick) {
  if (tick % 6 === 0) return ["guardian", "risk", monitorLine(world)];
  const row = pick(AMBIENT, tick, 3);
  if (row[0] !== "guardian") return row;
  return ["guardian", "risk", monitorLine(world)];
}

function beatShape(agentId, kind, text) {
  return { agentId, kind, sector: sectorFor(agentId), text };
}

export function planNext(world) {
  const tick = world.tick + 1;
  if (!world.running || !world.mission || world.gate) {
    if (tick % 2 !== 0) return null;
    const [agentId, kind, text] = ambientRow(world, tick);
    return beatShape(agentId, kind, text);
  }
  const progress = Math.min(90, world.mission.progress + 2);
  if (progress >= 90 && !world.gate) {
    return beatShape("guardian", "risk", "Human gate: evidence verdict required before any payout");
  }
  const squad = world.assigned.length ? world.assigned : ["commander"];
  const agentId = squad[tick % squad.length];
  const [kind, text] = pick(WORK[agentId] || WORK.commander, tick, progress);
  const eventKind = progress >= 72 && agentId === "analyst" ? "evidence" : kind;
  return beatShape(agentId, eventKind, text);
}

function pushEvent(world, event) {
  const next = {
    id: `E-${world.tick}-${world.events.length}-${event.agentId}`,
    at: world.now,
    sector: sectorFor(event.agentId),
    ...event,
  };
  world.events = [next, ...world.events].slice(0, EVENT_CAP);
  const agent = world.agents[event.agentId];
  if (agent) {
    agent.task = event.text;
    agent.lastAt = world.now;
    agent.status = event.kind === "risk" && /reject|kill|block/i.test(event.text) ? "BLOCKED" : "WORKING";
  }
  return next;
}

function recomputeCompliance(world) {
  const evidence = world.events.filter((item) => item.kind === "evidence" || item.kind === "analysis" || item.kind === "sim").length;
  const kills = world.events.filter((item) => item.kind === "risk" && /reject|kill|block/i.test(item.text)).length;
  const progress = world.mission?.progress ?? 0;
  world.compliance = {
    ...world.compliance,
    evidence,
    policyKills: kills,
    completionPct: progress,
    slaHold: progress >= 90 ? 100 : Math.min(99, 72 + Math.floor(progress / 6)),
    safe: world.compliance.mandate !== "REVOKED" && world.radar.decision !== "KILL",
    disputes: world.mission?.status === "killed" ? 1 : 0,
  };
}

export function createOpsWorld(now = 0) {
  const agents = Object.fromEntries(
    OPS_AGENTS.map((agent, index) => [
      agent.id,
      {
        id: agent.id,
        status: "STANDBY",
        energy: 88 - index * 4,
        task: AMBIENT[index][2],
        lastAt: now,
        checks: checksFor(agent.id),
      },
    ]),
  );
  const world = {
    now,
    tick: 0,
    running: false,
    selectedId: "commander",
    focusedNode: "MASTER AGENT",
    assigned: OPS_AGENTS.map((agent) => agent.id),
    mission: null,
    gate: null,
    events: [],
    agents,
    compliance: {
      mandate: "NONE",
      budgetUsed: 0,
      budgetMax: 1200,
      completionPct: 0,
      evidence: 0,
      policyKills: 0,
      disputes: 0,
      slaHold: 98,
      safe: true,
    },
    radar: {
      scanning: false,
      lastAt: 0,
      routes: 0,
      bestNet: 0,
      decision: "—",
      label: "BNB Smart Chain · observe only",
      error: "",
    },
    incoming: null,
  };
  AMBIENT.forEach(([agentId, kind, text], index) => {
    world.tick = index;
    pushEvent(world, { agentId, kind, text, tone: "idle" });
  });
  world.tick = 0;
  Object.values(world.agents).forEach((agent) => {
    agent.status = "STANDBY";
  });
  world.incoming = planNext(world);
  return world;
}

export function rosterAgent(id) {
  return OPS_AGENTS.find((agent) => agent.id === id) ?? OPS_AGENTS[2];
}

export function phaseForProgress(progress) {
  return Math.min(OPS_PHASES.length - 1, Math.floor(Math.max(0, progress) / 18));
}

export function selectAgent(world, id) {
  const next = clone(world);
  if (next.agents[id]) next.selectedId = id;
  return next;
}

export function clearLock(world) {
  const next = clone(world);
  next.selectedId = "commander";
  return next;
}

export function focusNode(world, nodeName) {
  const next = clone(world);
  next.focusedNode = nodeName;
  const agentId = NODE_FOCUS[nodeName];
  if (agentId) next.selectedId = agentId;
  pushEvent(next, {
    agentId: agentId || "commander",
    kind: "command",
    text: `Command camera locked on ${nodeName}`,
    tone: "focus",
  });
  return next;
}

export function toggleAssign(world, id) {
  const next = clone(world);
  next.assigned = next.assigned.includes(id)
    ? next.assigned.filter((item) => item !== id)
    : [...next.assigned, id];
  const agent = rosterAgent(id);
  pushEvent(next, {
    agentId: id,
    kind: "command",
    text: next.assigned.includes(id) ? `${agent.name} joined the live squad` : `${agent.name} stood down`,
    tone: "squad",
  });
  if (next.agents[id]) {
    next.agents[id].status = next.assigned.includes(id) ? (next.running ? "WORKING" : "READY") : "STANDBY";
  }
  return next;
}

export function deployMission(world, title, now = world.now) {
  const next = clone(world);
  next.now = now;
  next.running = true;
  next.tick += 1;
  next.mission = {
    id: `M-${String(now).slice(-4)}`,
    title: String(title || "Liquidity intelligence squad").trim() || "Liquidity intelligence squad",
    reward: "1,200 USDT",
    progress: 8,
    phaseIndex: 0,
    status: "active",
    startedAt: now,
  };
  next.gate = null;
  next.assigned = next.assigned.length ? next.assigned : OPS_AGENTS.map((agent) => agent.id);
  next.compliance.mandate = "ENABLED";
  next.compliance.budgetUsed = 0;
  next.compliance.disputes = 0;
  next.selectedId = "commander";
  Object.values(next.agents).forEach((agent) => {
    agent.status = next.assigned.includes(agent.id) ? "WORKING" : "STANDBY";
    agent.energy = Math.min(100, agent.energy + 6);
    agent.checks = checksFor(agent.id);
  });
  pushEvent(next, {
    agentId: "commander",
    kind: "command",
    text: `Mission ${next.mission.id} deployed — ${next.mission.title}`,
    tone: "deploy",
  });
  recomputeCompliance(next);
  next.incoming = planNext(next);
  return next;
}

export function setRunning(world, running) {
  const next = clone(world);
  if (!next.mission || next.mission.status === "settled" || next.mission.status === "killed") return next;
  next.running = Boolean(running);
  if (next.mission.status === "active" || next.mission.status === "paused") {
    next.mission.status = next.running ? "active" : "paused";
  }
  pushEvent(next, {
    agentId: "commander",
    kind: "command",
    text: next.running ? "Squad resumed live work" : "Squad paused — human holding the clock",
    tone: next.running ? "deploy" : "pause",
  });
  Object.values(next.agents).forEach((agent) => {
    if (next.assigned.includes(agent.id)) agent.status = next.running ? "WORKING" : "READY";
  });
  next.incoming = planNext(next);
  return next;
}

export function beginRadarScan(world, now = world.now) {
  const next = clone(world);
  next.now = now;
  next.radar = { ...next.radar, scanning: true, error: "" };
  next.selectedId = "scout";
  next.agents.scout.status = "WORKING";
  next.agents.scout.task = "Scanning PancakeSwap, ApeSwap and THENA";
  pushEvent(next, {
    agentId: "scout",
    kind: "scan",
    text: "Live radar sweep on BNB Smart Chain — observe only, execute blocked",
    tone: "scan",
  });
  return next;
}

export function ingestRadarScan(world, snapshot, now = world.now) {
  const next = clone(world);
  next.now = now;
  const routes = Array.isArray(snapshot?.opportunities) ? snapshot.opportunities.length : 0;
  const best = (snapshot?.opportunities || []).reduce((max, item) => Math.max(max, Number(item.spreadUsd) || 0), 0);
  next.radar = {
    scanning: false,
    lastAt: now,
    routes,
    bestNet: best,
    decision: next.radar.decision === "KILL" ? "KILL" : "—",
    label: snapshot?.chainLabel || snapshot?.chain || "BNB Smart Chain",
    error: snapshot?.error || "",
  };
  next.agents.scout.status = routes ? "WORKING" : "READY";
  pushEvent(next, {
    agentId: "scout",
    kind: "scan",
    text: next.radar.error
      ? `Radar scan failed: ${next.radar.error}`
      : `Radar live: ${routes} open routes · best spread $${best.toFixed(2)} · execute blocked`,
    tone: next.radar.error ? "alert" : "scan",
  });
  recomputeCompliance(next);
  next.incoming = planNext(next);
  return next;
}

export function ingestRadarSim(world, payload, now = world.now) {
  const next = clone(world);
  next.now = now;
  const net = Number(payload?.simulation?.netUsd) || 0;
  const decision = payload?.risk?.decision === "KILL" ? "KILL" : payload?.risk?.decision === "APPROVE" ? "APPROVE" : "—";
  next.radar = {
    ...next.radar,
    scanning: false,
    lastAt: now,
    bestNet: net,
    decision,
    error: payload?.error || "",
  };
  next.selectedId = decision === "KILL" ? "guardian" : "strategist";
  next.agents.strategist.status = "WORKING";
  next.agents.guardian.status = "WORKING";
  pushEvent(next, {
    agentId: "strategist",
    kind: "sim",
    text: `Simulation net $${net.toFixed(2)} · ${payload?.simulation?.source || "BSC-RPC"}`,
    tone: "sim",
  });
  pushEvent(next, {
    agentId: "guardian",
    kind: "risk",
    text: decision === "KILL"
      ? `Risk gate KILL — ${payload?.risk?.reasons?.[0] || "policy envelope failed"}`
      : "Risk gate APPROVE for observe/simulate only — execute still blocked",
    tone: decision === "KILL" ? "alert" : "risk",
  });
  recomputeCompliance(next);
  next.incoming = planNext(next);
  return next;
}

export function decideGate(world, decision, now = world.now) {
  const next = clone(world);
  next.now = now;
  if (!next.mission || !next.gate) return next;
  const approve = decision === "approve";
  if (next.gate.kind === "verdict") {
    if (approve) {
      next.mission.progress = 96;
      next.mission.phaseIndex = phaseForProgress(96);
      next.mission.status = "verdict";
      next.running = false;
      next.gate = { kind: "settle", label: "Settlement approval", prompt: "All work is verified. Sign a 0-value settlement memo on BSC Testnet." };
      pushEvent(next, {
        agentId: "analyst",
        kind: "evidence",
        text: "Evidence package sealed — awaiting human settlement signature",
        tone: "evidence",
      });
    } else {
      next.mission.status = "killed";
      next.running = false;
      next.gate = null;
      next.compliance.mandate = "REVOKED";
      pushEvent(next, {
        agentId: "guardian",
        kind: "risk",
        text: "Human killed the route — mandate spend remains untouched",
        tone: "alert",
      });
    }
  } else if (next.gate.kind === "settle") {
    if (approve) {
      next.mission.progress = 100;
      next.mission.phaseIndex = OPS_PHASES.length - 1;
      next.mission.status = "settled";
      next.running = false;
      next.gate = null;
      next.compliance.budgetUsed = next.compliance.budgetMax;
      pushEvent(next, {
        agentId: "executor",
        kind: "exec",
        text: `Settlement receipt queued for ${next.mission.reward}`,
        tone: "settle",
      });
    } else {
      next.mission.status = "killed";
      next.running = false;
      next.gate = null;
      pushEvent(next, {
        agentId: "guardian",
        kind: "risk",
        text: "Settlement refused — escrow stays locked",
        tone: "alert",
      });
    }
  }
  recomputeCompliance(next);
  next.incoming = planNext(next);
  return next;
}

export function markSettled(world, txHash, now = world.now) {
  const next = clone(world);
  next.now = now;
  if (!next.mission) return next;
  next.mission.progress = 100;
  next.mission.phaseIndex = OPS_PHASES.length - 1;
  next.mission.status = "settled";
  next.mission.txHash = txHash;
  next.running = false;
  next.gate = null;
  next.compliance.budgetUsed = next.compliance.budgetMax;
  pushEvent(next, {
    agentId: "executor",
    kind: "exec",
    text: `On-chain receipt ${String(txHash).slice(0, 10)}…${String(txHash).slice(-6)}`,
    tone: "settle",
  });
  recomputeCompliance(next);
  next.incoming = planNext(next);
  return next;
}

export function pulseNetwork(world, now = world.now) {
  const next = clone(world);
  next.now = now;
  next.tick += 1;
  pushEvent(next, {
    agentId: "commander",
    kind: "command",
    text: "Network pulse — all agents report in",
    tone: "pulse",
  });
  next.assigned.forEach((id, index) => {
    const [kind, text] = pick(WORK[id] || WORK.commander, next.tick, index);
    next.agents[id].status = "WORKING";
    next.agents[id].energy = Math.max(18, next.agents[id].energy - 2);
    pushEvent(next, { agentId: id, kind, text, tone: "pulse" });
  });
  recomputeCompliance(next);
  next.incoming = planNext(next);
  return next;
}

export function tickWorld(world, now = world.now + 1600) {
  const next = clone(world);
  next.now = now;
  next.tick += 1;

  if (!next.running || !next.mission || next.gate) {
    next.agents.guardian.task = monitorLine(next);
    const [agentId, kind, text] = ambientRow(next, next.tick);
    if (next.tick % 2 === 0) {
      pushEvent(next, { agentId, kind, text, tone: "idle" });
      next.agents[agentId].status = "STANDBY";
      next.agents[agentId].energy = Math.min(100, next.agents[agentId].energy + 1);
    }
    recomputeCompliance(next);
    next.incoming = planNext(next);
    return next;
  }

  next.mission.progress = Math.min(90, next.mission.progress + 2);
  next.mission.phaseIndex = phaseForProgress(next.mission.progress);

  if (next.mission.progress >= 90 && !next.gate) {
    next.running = false;
    next.mission.status = "verdict";
    next.gate = {
      kind: "verdict",
      label: "Evidence verdict",
      prompt: "Oracle sealed the package. Approve to arm settlement, or kill the route.",
    };
    next.agents.guardian.status = "BLOCKED";
    pushEvent(next, {
      agentId: "guardian",
      kind: "risk",
      text: "Human gate: evidence verdict required before any payout",
      tone: "alert",
    });
    recomputeCompliance(next);
    next.incoming = planNext(next);
    return next;
  }

  const squad = next.assigned.length ? next.assigned : ["commander"];
  const agentId = squad[next.tick % squad.length];
  const [kind, text] = pick(WORK[agentId] || WORK.commander, next.tick, next.mission.progress);
  const eventKind = next.mission.progress >= 72 && agentId === "analyst" ? "evidence" : kind;
  pushEvent(next, { agentId, kind: eventKind, text, tone: "live" });
  next.agents[agentId].energy = Math.max(14, next.agents[agentId].energy - 3);
  completeNextCheck(next.agents[agentId]);

  recomputeCompliance(next);
  next.incoming = planNext(next);
  return next;
}

export function reportLine(world, agentId) {
  const agent = world.agents[agentId];
  const roster = rosterAgent(agentId);
  if (!agent) return `${roster.name} standing by.`;
  return `${roster.name}. ${agent.task}. Status ${agent.status}.`;
}
