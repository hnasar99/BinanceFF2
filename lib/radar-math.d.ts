export const MICRO: number;
export const QUOTE_TTL_MS: number;
export const OPPORTUNITY_TTL_MS: number;
export const DEFAULT_NOTIONAL_USD: number;
export const DEFAULT_SLIPPAGE_BPS: number;
export const RADAR_SOURCE: string;
export const RADAR_MODE: string;

export type ChainStatus = "live" | "schema-ready";
export type RadarQuote = {
  source: string;
  chain: string;
  venue: string;
  venueName: string;
  pair: string;
  side: "buy" | "sell";
  priceUsd: number;
  feeBps: number;
  gasUsd: number;
  liquidityUsd: number;
  quotedAt: number;
  expiresAt: number;
  status: "LIVE" | "STALE";
};
export type RadarOpportunity = {
  publicCode: string;
  chain: string;
  pair: string;
  buyVenue: string;
  buyVenueName: string;
  sellVenue: string;
  sellVenueName: string;
  buyPriceUsd: number;
  sellPriceUsd: number;
  spreadUsd: number;
  source: string;
  status: "OPEN" | "EXPIRED" | "APPROVED" | "REJECTED";
  expiresAt: number;
  createdAt: number;
  buyQuote: RadarQuote;
  sellQuote: RadarQuote;
};
export type RadarSimulation = {
  notionalUsd: number;
  sizeBase: number;
  sellNotionalUsd: number;
  grossUsd: number;
  buyFeeUsd: number;
  sellFeeUsd: number;
  feesUsd: number;
  gasUsd: number;
  slippageUsd: number;
  slippageBps: number;
  netUsd: number;
  netBps: number;
  adverse: Array<{ id: string; label: string; netUsd: number; pass: boolean }>;
  source: string;
  chain: string;
  pair: string;
  createdAt: number;
};
export type RadarRisk = {
  decision: "APPROVE" | "KILL";
  reasons: string[];
  execute: false;
  actions: string[];
};

export const CHAINS: Array<{ id: string; label: string; native: string; status: ChainStatus; chainId: number }>;
export const VENUES: Array<{ id: string; name: string; chain: string; feeBps: number; kind: string }>;
export const PAIRS: string[];

export function usdToMicro(value: number): number;
export function microToUsd(value: number): number;
export function chainById(chainId: string): (typeof CHAINS)[number] | null;
export function venuesFor(chainId: string): typeof VENUES;
export function isStale(expiresAt: number, now: number): boolean;
export function computeNet(input: {
  buyPriceUsd: number;
  sellPriceUsd: number;
  buyFeeBps: number;
  sellFeeBps: number;
  buyGasUsd: number;
  sellGasUsd: number;
  notionalUsd: number;
  slippageBps?: number;
}): Omit<RadarSimulation, "adverse" | "source" | "chain" | "pair" | "createdAt">;
export function assessRisk(input: {
  chain: string;
  buyQuote: RadarQuote;
  sellQuote: RadarQuote;
  simulation: RadarSimulation;
  now: number;
}): RadarRisk;
export function scanFromBooks(
  books: Record<string, Record<string, { bid: number; ask: number; liquidityUsd: number; gasUsd: number }>>,
  options?: {
    chainId?: string;
    now?: number;
    notionalUsd?: number;
    source?: string;
    venues?: typeof VENUES;
  },
): {
  source: string;
  mode: string;
  execute: false;
  chain: string;
  chainLabel: string;
  notionalUsd: number;
  scannedAt: number;
  quoteTtlMs: number;
  venues: Array<(typeof VENUES)[number] & { source: string }>;
  quotes: RadarQuote[];
  opportunities: RadarOpportunity[];
};
export function scanChain(chainId: string, now?: number, notionalUsd?: number): {
  source: string;
  mode: string;
  execute: false;
  chain: string;
  chainLabel: string;
  notionalUsd: number;
  scannedAt: number;
  quoteTtlMs: number;
  venues: Array<(typeof VENUES)[number] & { source: string }>;
  quotes: RadarQuote[];
  opportunities: RadarOpportunity[];
};
export function simulateOpportunity(
  opportunity: RadarOpportunity,
  now?: number,
  notionalUsd?: number,
  slippageBps?: number,
): { opportunity: RadarOpportunity; simulation: RadarSimulation; risk: RadarRisk; execute: false };
export function catalog(source?: string, venues?: typeof VENUES): {
  source: string;
  mode: string;
  execute: false;
  chains: typeof CHAINS;
  venues: Array<(typeof VENUES)[number] & { source: string }>;
  pairs: string[];
  quoteTtlMs: number;
  defaults: { notionalUsd: number; slippageBps: number };
};
