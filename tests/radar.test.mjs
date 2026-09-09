import assert from "node:assert/strict";
import test from "node:test";
import {
  CHAINS,
  DEFAULT_NOTIONAL_USD,
  assessRisk,
  catalog,
  computeNet,
  isStale,
  scanChain,
  simulateOpportunity,
} from "../lib/radar-math.mjs";

test("catalog exposes BSC live and other chains as schema-ready", () => {
  const snapshot = catalog();
  assert.equal(snapshot.execute, false);
  assert.equal(snapshot.source, "MOCK");
  assert.equal(snapshot.venues.length, 3);
  assert.deepEqual(
    snapshot.venues.map((venue) => venue.id),
    ["pancakeswap", "biswap", "thena"],
  );
  assert.equal(CHAINS.find((chain) => chain.id === "bnb-smart-chain")?.status, "live");
  assert.equal(CHAINS.find((chain) => chain.id === "ethereum")?.status, "schema-ready");
});

test("scan finds same-chain BNB routes across three mock venues", () => {
  const snapshot = scanChain("bnb-smart-chain", 1_700_000_000_000);
  assert.equal(snapshot.execute, false);
  assert.ok(snapshot.opportunities.length >= 2);
  assert.ok(snapshot.opportunities.every((item) => item.chain === "bnb-smart-chain"));
  assert.ok(snapshot.opportunities.every((item) => item.buyVenue !== item.sellVenue));
  const bnb = snapshot.opportunities.find((item) => item.pair === "BNB/USDT" && item.buyVenue === "thena" && item.sellVenue === "biswap");
  assert.ok(bnb);
  assert.equal(bnb.buyPriceUsd, 611.4);
  assert.equal(bnb.sellPriceUsd, 618.2);
});

test("unsupported chains stay schema-ready and do not scan", () => {
  assert.throws(() => scanChain("ethereum"), { code: "chain_not_enabled" });
  assert.throws(() => scanChain("base"), { code: "chain_not_enabled" });
});

test("net profit subtracts fees, gas and slippage", () => {
  const economics = computeNet({
    buyPriceUsd: 100,
    sellPriceUsd: 101,
    buyFeeBps: 20,
    sellFeeBps: 10,
    buyGasUsd: 0.2,
    sellGasUsd: 0.3,
    notionalUsd: 1_000,
    slippageBps: 8,
  });
  assert.equal(economics.grossUsd, 10);
  assert.equal(economics.feesUsd, 3.01);
  assert.equal(economics.gasUsd, 0.5);
  assert.equal(economics.slippageUsd, 0.8);
  assert.equal(economics.netUsd, 5.69);
});

test("THENA to Biswap BNB route survives costs and risk gate", () => {
  const snapshot = scanChain("bnb-smart-chain", 1_700_000_000_000, DEFAULT_NOTIONAL_USD);
  const opportunity = snapshot.opportunities.find((item) => item.pair === "BNB/USDT" && item.buyVenue === "thena" && item.sellVenue === "biswap");
  const result = simulateOpportunity(opportunity, 1_700_000_000_000);
  assert.ok(result.simulation.netUsd > 1);
  assert.equal(result.risk.decision, "APPROVE");
  assert.equal(result.execute, false);
  assert.deepEqual(result.risk.actions, ["read", "simulate", "propose"]);
});

test("thin ETH spread is killed after costs", () => {
  const snapshot = scanChain("bnb-smart-chain", 1_700_000_000_000);
  const opportunity = snapshot.opportunities.find((item) => item.pair === "ETH/USDT" && item.buyVenue === "pancakeswap" && item.sellVenue === "thena");
  const result = simulateOpportunity(opportunity, 1_700_000_000_000);
  assert.ok(result.simulation.netUsd < 1);
  assert.equal(result.risk.decision, "KILL");
  assert.match(result.risk.reasons.join(" "), /Net benefit|Adverse scenario/);
});

test("stale quotes are rejected", () => {
  const snapshot = scanChain("bnb-smart-chain", 1_000);
  const opportunity = snapshot.opportunities[0];
  const result = simulateOpportunity(opportunity, 100_000);
  assert.equal(result.opportunity.status, "EXPIRED");
  assert.equal(result.risk.decision, "KILL");
  assert.match(result.risk.reasons.join(" "), /expired/i);
  assert.equal(isStale(opportunity.buyQuote.expiresAt, 100_000), true);
});

test("risk sentinel kills cross-chain routes", () => {
  const snapshot = scanChain("bnb-smart-chain", 1_700_000_000_000);
  const opportunity = snapshot.opportunities.find((item) => item.pair === "BNB/USDT" && item.buyVenue === "thena");
  const risk = assessRisk({
    chain: "ethereum",
    buyQuote: opportunity.buyQuote,
    sellQuote: opportunity.sellQuote,
    simulation: { ...simulateOpportunity(opportunity, 1_700_000_000_000).simulation, netUsd: 12 },
    now: 1_700_000_000_000,
  });
  assert.equal(risk.decision, "KILL");
  assert.match(risk.reasons.join(" "), /bridge/i);
});
