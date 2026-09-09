/** Fixture books plus net-arbitrage math. Unit tests use MOCK books; /api/radar uses live BSC RPC. */

export const MICRO = 1_000_000;
export const QUOTE_TTL_MS = 45_000;
export const OPPORTUNITY_TTL_MS = 90_000;
export const DEFAULT_NOTIONAL_USD = 2_000;
export const DEFAULT_SLIPPAGE_BPS = 8;
export const MAX_SLIPPAGE_BPS = 40;
export const MAX_GAS_SHARE = 0.35;
export const MIN_NET_USD = 1;
export const MIN_LIQUIDITY_MULTIPLE = 3;
export const RADAR_SOURCE = "MOCK";
export const RADAR_MODE = "observe-quote-simulate-risk";

export const CHAINS = [
  { id: "bnb-smart-chain", label: "BNB Smart Chain", native: "BNB", status: "live", chainId: 56 },
  { id: "ethereum", label: "Ethereum", native: "ETH", status: "schema-ready", chainId: 1 },
  { id: "base", label: "Base", native: "ETH", status: "schema-ready", chainId: 8453 },
  { id: "solana", label: "Solana", native: "SOL", status: "schema-ready", chainId: 0 },
];

export const VENUES = [
  { id: "pancakeswap", name: "PancakeSwap", chain: "bnb-smart-chain", feeBps: 25, kind: "DEX" },
  { id: "biswap", name: "Biswap", chain: "bnb-smart-chain", feeBps: 10, kind: "DEX" },
  { id: "thena", name: "THENA", chain: "bnb-smart-chain", feeBps: 20, kind: "DEX" },
];

export const PAIRS = ["BNB/USDT", "ETH/USDT", "CAKE/USDT"];

/** Deterministic mock books. Prices are USD. Adapters are explicitly MOCK. */
export const BOOKS = {
  pancakeswap: {
    "BNB/USDT": { bid: 612.4, ask: 612.85, liquidityUsd: 1_200_000, gasUsd: 0.18 },
    "ETH/USDT": { bid: 3510.2, ask: 3510.8, liquidityUsd: 800_000, gasUsd: 0.22 },
    "CAKE/USDT": { bid: 1.842, ask: 1.846, liquidityUsd: 180_000, gasUsd: 0.12 },
  },
  biswap: {
    "BNB/USDT": { bid: 618.2, ask: 618.5, liquidityUsd: 420_000, gasUsd: 0.16 },
    "ETH/USDT": { bid: 3509.4, ask: 3510.1, liquidityUsd: 90_000, gasUsd: 0.2 },
    "CAKE/USDT": { bid: 1.871, ask: 1.876, liquidityUsd: 55_000, gasUsd: 0.1 },
  },
  thena: {
    "BNB/USDT": { bid: 611.1, ask: 611.4, liquidityUsd: 310_000, gasUsd: 0.2 },
    "ETH/USDT": { bid: 3511.0, ask: 3511.5, liquidityUsd: 70_000, gasUsd: 0.24 },
    "CAKE/USDT": { bid: 1.838, ask: 1.841, liquidityUsd: 40_000, gasUsd: 0.11 },
  },
};

export function usdToMicro(value) {
  return Math.round(Number(value) * MICRO);
}

export function microToUsd(value) {
  return Number(value) / MICRO;
}

export function roundUsd(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

export function chainById(chainId) {
  return CHAINS.find((chain) => chain.id === chainId) || null;
}

export function venuesFor(chainId) {
  return VENUES.filter((venue) => venue.chain === chainId);
}

export function assertLiveChain(chainId) {
  const chain = chainById(chainId);
  if (!chain) {
    const error = new Error(`Unknown chain: ${chainId}`);
    error.code = "unknown_chain";
    throw error;
  }
  if (chain.status !== "live") {
    const error = new Error(
      `${chain.label} venues are schema-ready, not live. Radar scans BNB Smart Chain until a venue adapter ships.`,
    );
    error.code = "chain_not_enabled";
    error.chain = chain.id;
    throw error;
  }
  return chain;
}

export function readBook(venueId, pair, books = BOOKS, source = RADAR_SOURCE, venueList = VENUES) {
  const book = books[venueId]?.[pair];
  if (!book) return null;
  const venue = venueList.find((item) => item.id === venueId);
  return {
    source,
    venueId,
    venueName: venue?.name || venueId,
    chain: venue?.chain || "bnb-smart-chain",
    pair,
    feeBps: venue?.feeBps || 0,
    bidUsd: book.bid,
    askUsd: book.ask,
    liquidityUsd: book.liquidityUsd,
    gasUsd: book.gasUsd,
  };
}

export function quoteFromBook(book, side, now, ttlMs = QUOTE_TTL_MS) {
  const priceUsd = side === "buy" ? book.askUsd : book.bidUsd;
  return {
    source: book.source || RADAR_SOURCE,
    chain: book.chain,
    venue: book.venueId,
    venueName: book.venueName,
    pair: book.pair,
    side,
    priceUsd: roundUsd(priceUsd, 6),
    feeBps: book.feeBps,
    gasUsd: roundUsd(book.gasUsd, 4),
    liquidityUsd: book.liquidityUsd,
    quotedAt: now,
    expiresAt: now + ttlMs,
    status: "LIVE",
  };
}

export function isStale(expiresAt, now) {
  return Number(expiresAt) <= Number(now);
}

export function computeNet({
  buyPriceUsd,
  sellPriceUsd,
  buyFeeBps,
  sellFeeBps,
  buyGasUsd,
  sellGasUsd,
  notionalUsd,
  slippageBps = DEFAULT_SLIPPAGE_BPS,
}) {
  const notional = Number(notionalUsd);
  const sizeBase = notional / Number(buyPriceUsd);
  const sellNotional = sizeBase * Number(sellPriceUsd);
  const grossUsd = sellNotional - notional;
  const buyFeeUsd = notional * Number(buyFeeBps) / 10_000;
  const sellFeeUsd = sellNotional * Number(sellFeeBps) / 10_000;
  const feesUsd = buyFeeUsd + sellFeeUsd;
  const gasUsd = Number(buyGasUsd) + Number(sellGasUsd);
  const slippageUsd = notional * Number(slippageBps) / 10_000;
  const netUsd = grossUsd - feesUsd - gasUsd - slippageUsd;
  const netBps = notional === 0 ? 0 : (netUsd / notional) * 10_000;
  return {
    notionalUsd: roundUsd(notional, 4),
    sizeBase: roundUsd(sizeBase, 8),
    sellNotionalUsd: roundUsd(sellNotional, 4),
    grossUsd: roundUsd(grossUsd, 4),
    buyFeeUsd: roundUsd(buyFeeUsd, 4),
    sellFeeUsd: roundUsd(sellFeeUsd, 4),
    feesUsd: roundUsd(feesUsd, 4),
    gasUsd: roundUsd(gasUsd, 4),
    slippageUsd: roundUsd(slippageUsd, 4),
    slippageBps: Number(slippageBps),
    netUsd: roundUsd(netUsd, 4),
    netBps: roundUsd(netBps, 2),
  };
}

export function adverseCases(base) {
  const gasShock = computeNet({
    buyPriceUsd: base.buyPriceUsd,
    sellPriceUsd: base.sellPriceUsd,
    buyFeeBps: base.buyFeeBps,
    sellFeeBps: base.sellFeeBps,
    buyGasUsd: base.buyGasUsd * 2,
    sellGasUsd: base.sellGasUsd * 2,
    notionalUsd: base.notionalUsd,
    slippageBps: base.slippageBps,
  });
  const slipShock = computeNet({
    buyPriceUsd: base.buyPriceUsd,
    sellPriceUsd: base.sellPriceUsd,
    buyFeeBps: base.buyFeeBps,
    sellFeeBps: base.sellFeeBps,
    buyGasUsd: base.buyGasUsd,
    sellGasUsd: base.sellGasUsd,
    notionalUsd: base.notionalUsd,
    slippageBps: base.slippageBps * 2,
  });
  const moveShock = computeNet({
    buyPriceUsd: base.buyPriceUsd * 1.0015,
    sellPriceUsd: base.sellPriceUsd * 0.9985,
    buyFeeBps: base.buyFeeBps,
    sellFeeBps: base.sellFeeBps,
    buyGasUsd: base.buyGasUsd,
    sellGasUsd: base.sellGasUsd,
    notionalUsd: base.notionalUsd,
    slippageBps: base.slippageBps,
  });
  return [
    { id: "gas-2x", label: "Gas doubles", netUsd: gasShock.netUsd, pass: gasShock.netUsd >= MIN_NET_USD },
    { id: "slippage-2x", label: "Slippage doubles", netUsd: slipShock.netUsd, pass: slipShock.netUsd >= MIN_NET_USD },
    { id: "adverse-15bps", label: "15 bps adverse move", netUsd: moveShock.netUsd, pass: moveShock.netUsd >= MIN_NET_USD },
  ];
}

export function assessRisk({
  chain,
  buyQuote,
  sellQuote,
  simulation,
  now,
}) {
  const reasons = [];
  if (chain !== buyQuote.chain || chain !== sellQuote.chain) {
    reasons.push("Cross-chain bridge risk is not wired; only same-chain routes may pass.");
  }
  if (isStale(buyQuote.expiresAt, now) || isStale(sellQuote.expiresAt, now)) {
    reasons.push("Quote expired. Stale quotes are rejected.");
  }
  if (simulation.slippageBps > MAX_SLIPPAGE_BPS) {
    reasons.push(`Slippage ${simulation.slippageBps} bps exceeds the ${MAX_SLIPPAGE_BPS} bps gate.`);
  }
  if (buyQuote.liquidityUsd < simulation.notionalUsd * MIN_LIQUIDITY_MULTIPLE) {
    reasons.push(`Buy venue liquidity ${buyQuote.liquidityUsd} USDT is below ${MIN_LIQUIDITY_MULTIPLE}x notional.`);
  }
  if (sellQuote.liquidityUsd < simulation.notionalUsd * MIN_LIQUIDITY_MULTIPLE) {
    reasons.push(`Sell venue liquidity ${sellQuote.liquidityUsd} USDT is below ${MIN_LIQUIDITY_MULTIPLE}x notional.`);
  }
  if (simulation.grossUsd > 0 && simulation.gasUsd / simulation.grossUsd > MAX_GAS_SHARE) {
    reasons.push("Gas consumes more than 35% of gross spread.");
  }
  if (simulation.netUsd < MIN_NET_USD) {
    reasons.push(`Net benefit ${simulation.netUsd} USDT is below the ${MIN_NET_USD} USDT floor.`);
  }
  const failedAdverse = (simulation.adverse || []).filter((item) => !item.pass);
  if (failedAdverse.length) {
    reasons.push(`Adverse scenario failed: ${failedAdverse.map((item) => item.label).join(", ")}.`);
  }
  return {
    decision: reasons.length ? "KILL" : "APPROVE",
    reasons,
    execute: false,
    actions: ["read", "simulate", "propose"],
  };
}

export function scanFromBooks(books, {
  chainId = "bnb-smart-chain",
  now = Date.now(),
  notionalUsd = DEFAULT_NOTIONAL_USD,
  source = RADAR_SOURCE,
  venues,
} = {}) {
  const chain = assertLiveChain(chainId);
  const venueList = venues || venuesFor(chain.id).filter((venue) => books[venue.id]);
  const quotes = [];
  const opportunities = [];

  for (const pair of PAIRS) {
    const pairBooks = venueList.map((venue) => readBook(venue.id, pair, books, source, venueList)).filter(Boolean);
    for (const book of pairBooks) {
      quotes.push(quoteFromBook(book, "buy", now));
      quotes.push(quoteFromBook(book, "sell", now));
    }
    for (const buyBook of pairBooks) {
      for (const sellBook of pairBooks) {
        if (buyBook.venueId === sellBook.venueId) continue;
        if (sellBook.bidUsd <= buyBook.askUsd) continue;
        const buyQuote = quoteFromBook(buyBook, "buy", now);
        const sellQuote = quoteFromBook(sellBook, "sell", now);
        const code = `OPP-${pair.split("/")[0]}-${buyBook.venueId.slice(0, 3)}-${sellBook.venueId.slice(0, 3)}`.toUpperCase();
        opportunities.push({
          publicCode: code,
          chain: chain.id,
          pair,
          buyVenue: buyBook.venueId,
          buyVenueName: buyBook.venueName,
          sellVenue: sellBook.venueId,
          sellVenueName: sellBook.venueName,
          buyPriceUsd: buyQuote.priceUsd,
          sellPriceUsd: sellQuote.priceUsd,
          spreadUsd: roundUsd(sellQuote.priceUsd - buyQuote.priceUsd, 6),
          source,
          status: "OPEN",
          expiresAt: now + OPPORTUNITY_TTL_MS,
          createdAt: now,
          buyQuote,
          sellQuote,
        });
      }
    }
  }

  opportunities.sort((a, b) => b.spreadUsd / b.buyPriceUsd - a.spreadUsd / a.buyPriceUsd);
  return {
    source,
    mode: RADAR_MODE,
    execute: false,
    chain: chain.id,
    chainLabel: chain.label,
    notionalUsd,
    scannedAt: now,
    quoteTtlMs: QUOTE_TTL_MS,
    venues: venueList.map((venue) => ({ ...venue, source })),
    quotes,
    opportunities,
  };
}

export function scanChain(chainId, now = Date.now(), notionalUsd = DEFAULT_NOTIONAL_USD) {
  return scanFromBooks(BOOKS, { chainId, now, notionalUsd, source: RADAR_SOURCE, venues: venuesFor(chainId) });
}

export function simulateOpportunity(opportunity, now = Date.now(), notionalUsd = DEFAULT_NOTIONAL_USD, slippageBps = DEFAULT_SLIPPAGE_BPS) {
  const buyQuote = opportunity.buyQuote;
  const sellQuote = opportunity.sellQuote;
  const inputs = {
    buyPriceUsd: buyQuote.priceUsd,
    sellPriceUsd: sellQuote.priceUsd,
    buyFeeBps: buyQuote.feeBps,
    sellFeeBps: sellQuote.feeBps,
    buyGasUsd: buyQuote.gasUsd,
    sellGasUsd: sellQuote.gasUsd,
    notionalUsd,
    slippageBps,
  };
  const economics = computeNet(inputs);
  const adverse = adverseCases(inputs);
  const simulation = {
    ...economics,
    adverse,
    source: opportunity.source || RADAR_SOURCE,
    chain: opportunity.chain,
    pair: opportunity.pair,
    createdAt: now,
  };
  const risk = assessRisk({
    chain: opportunity.chain,
    buyQuote,
    sellQuote,
    simulation,
    now,
  });
  return {
    opportunity: {
      ...opportunity,
      status: isStale(opportunity.expiresAt, now) ? "EXPIRED" : risk.decision === "APPROVE" ? "APPROVED" : "REJECTED",
    },
    simulation,
    risk,
    execute: false,
  };
}

export function catalog(source = RADAR_SOURCE, venues = VENUES) {
  return {
    source,
    mode: RADAR_MODE,
    execute: false,
    chains: CHAINS,
    venues: venues.map((venue) => ({ ...venue, source })),
    pairs: PAIRS,
    quoteTtlMs: QUOTE_TTL_MS,
    defaults: { notionalUsd: DEFAULT_NOTIONAL_USD, slippageBps: DEFAULT_SLIPPAGE_BPS },
  };
}
