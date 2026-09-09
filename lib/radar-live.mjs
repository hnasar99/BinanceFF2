/** Live BSC DEX books via public RPC. Missing pairs are skipped; RPC failure is fatal. */

import {
  BSC_MAINNET_RPCS,
  addrWord,
  decodeAddress,
  decodeUint,
  ethCall,
  rpcBatch,
  toDecimal,
} from "./chain-rpc.mjs";
import {
  DEFAULT_NOTIONAL_USD,
  RADAR_MODE,
  catalog,
  roundUsd,
  scanFromBooks,
} from "./radar-math.mjs";

export const RADAR_LIVE_SOURCE = "BSC-RPC";

export const TOKENS = {
  WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  USDT: "0x55d398326f99059fF775485246999027B3197955",
  ETH: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
  CAKE: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
};

export const PAIR_TOKENS = {
  "BNB/USDT": [TOKENS.WBNB, TOKENS.USDT],
  "ETH/USDT": [TOKENS.ETH, TOKENS.USDT],
  "CAKE/USDT": [TOKENS.CAKE, TOKENS.USDT],
};

export const LIVE_VENUES = [
  {
    id: "pancakeswap",
    name: "PancakeSwap",
    chain: "bnb-smart-chain",
    feeBps: 25,
    kind: "DEX",
    factory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
    pairKind: "uniswap-v2",
  },
  {
    id: "apeswap",
    name: "ApeSwap",
    chain: "bnb-smart-chain",
    feeBps: 20,
    kind: "DEX",
    factory: "0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6",
    pairKind: "uniswap-v2",
  },
  {
    id: "thena",
    name: "THENA",
    chain: "bnb-smart-chain",
    feeBps: 20,
    kind: "DEX",
    factory: "0xAFD89d21BdB66d00817d4153E055830B1c2B3970",
    pairKind: "solidly",
  },
];

const GET_PAIR = "0xe6a43905";
const GET_PAIR_STABLE = "0x6801cc30";
const GET_RESERVES = "0x0902f1ac";

export function catalogLive() {
  return catalog(RADAR_LIVE_SOURCE, LIVE_VENUES.map(({ factory, pairKind, ...venue }) => venue));
}

export function bookFromReserves({ reserveBase, reserveQuote, feeBps, gasUsd }) {
  const base = Number(reserveBase);
  const quote = Number(reserveQuote);
  if (!(base > 0) || !(quote > 0)) return null;
  const mid = quote / base;
  const fee = Number(feeBps) / 10_000;
  return {
    bid: roundUsd(mid * (1 - fee), 6),
    ask: roundUsd(mid * (1 + fee), 6),
    liquidityUsd: roundUsd(quote * 2, 2),
    gasUsd: roundUsd(gasUsd, 4),
  };
}

function pairCall(venue, tokenA, tokenB, stable = false) {
  if (venue.pairKind === "solidly") {
    return ethCall(venue.factory, GET_PAIR_STABLE + addrWord(tokenA) + addrWord(tokenB) + (stable ? uintOne() : uintZero()));
  }
  return ethCall(venue.factory, GET_PAIR + addrWord(tokenA) + addrWord(tokenB));
}

function uintZero() {
  return "0".repeat(64);
}

function uintOne() {
  return "0".repeat(63) + "1";
}

function resolvePair(venue, results, index) {
  if (venue.pairKind === "solidly") {
    return decodeAddress(results[index]) || decodeAddress(results[index + 1]);
  }
  return decodeAddress(results[index]);
}

export async function loadLiveBooks() {
  const pairEntries = Object.entries(PAIR_TOKENS);
  const pairCalls = [];
  const pairIndex = [];

  for (const venue of LIVE_VENUES) {
    for (const [pair, tokens] of pairEntries) {
      pairIndex.push({ venue, pair, tokens, offset: pairCalls.length });
      pairCalls.push(pairCall(venue, tokens[0], tokens[1], false));
      if (venue.pairKind === "solidly") pairCalls.push(pairCall(venue, tokens[0], tokens[1], true));
    }
  }

  const pairResults = await rpcBatch([...pairCalls, { method: "eth_gasPrice", params: [] }], BSC_MAINNET_RPCS);
  const gasPriceWei = decodeUint(pairResults[pairResults.length - 1] || pairResults.at(-1));

  const poolCalls = [];
  const pools = [];
  for (const item of pairIndex) {
    const pairAddress = resolvePair(item.venue, pairResults, item.offset);
    if (!pairAddress) continue;
    pools.push({ ...item, pairAddress, poolOffset: poolCalls.length });
    poolCalls.push(ethCall(pairAddress, GET_RESERVES));
  }

  if (!pools.length) {
    const error = new Error("No live DEX pairs resolved on BNB Smart Chain.");
    error.code = "radar_empty";
    throw error;
  }

  const poolResults = await rpcBatch(poolCalls, BSC_MAINNET_RPCS);
  const books = {};
  let bnbUsd = 0;

  for (const pool of pools) {
    const reserves = poolResults[pool.poolOffset];
    const reserve0 = toDecimal(decodeUint(reserves, 0));
    const reserve1 = toDecimal(decodeUint(reserves, 1));
    const quoteIsToken0 = pool.tokens[1].toLowerCase() < pool.tokens[0].toLowerCase();
    const reserveQuote = quoteIsToken0 ? reserve0 : reserve1;
    const reserveBase = quoteIsToken0 ? reserve1 : reserve0;
    if (pool.pair === "BNB/USDT" && pool.venue.id === "pancakeswap") bnbUsd = reserveQuote / reserveBase;
    const gasUsd = bnbUsd > 0
      ? toDecimal(gasPriceWei * 180000n) * bnbUsd
      : 0.2;
    const book = bookFromReserves({
      reserveBase,
      reserveQuote,
      feeBps: pool.venue.feeBps,
      gasUsd,
    });
    if (!book) continue;
    books[pool.venue.id] ||= {};
    books[pool.venue.id][pool.pair] = book;
  }

  if (bnbUsd > 0) {
    const gasUsd = toDecimal(gasPriceWei * 180000n) * bnbUsd;
    for (const venueBooks of Object.values(books)) {
      for (const book of Object.values(venueBooks)) book.gasUsd = roundUsd(gasUsd, 4);
    }
  }

  if (!Object.keys(books).length) {
    const error = new Error("Live reserves were empty on every venue.");
    error.code = "radar_empty";
    throw error;
  }

  return {
    books,
    venues: LIVE_VENUES
      .filter((venue) => books[venue.id])
      .map(({ factory, pairKind, ...venue }) => venue),
    gasUsd: bnbUsd > 0 ? roundUsd(toDecimal(gasPriceWei * 180000n) * bnbUsd, 4) : 0.2,
    bnbUsd: roundUsd(bnbUsd || 0, 4),
    source: RADAR_LIVE_SOURCE,
  };
}

export async function scanLiveChain(chainId, now = Date.now(), notionalUsd = DEFAULT_NOTIONAL_USD) {
  const live = await loadLiveBooks();
  return {
    ...scanFromBooks(live.books, {
      chainId,
      now,
      notionalUsd,
      source: RADAR_LIVE_SOURCE,
      venues: live.venues,
    }),
    mode: RADAR_MODE,
    bnbUsd: live.bnbUsd,
    gasUsd: live.gasUsd,
  };
}
