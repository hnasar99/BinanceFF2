import type { RadarOpportunity, RadarQuote } from "./radar-math.mjs";

export const RADAR_LIVE_SOURCE: "BSC-RPC";
export const LIVE_VENUES: Array<{
  id: string;
  name: string;
  chain: string;
  feeBps: number;
  kind: string;
}>;
export function catalogLive(): {
  source: "BSC-RPC";
  mode: string;
  execute: false;
  chains: unknown[];
  venues: Array<{ id: string; name: string; chain: string; feeBps: number; kind: string; source: "BSC-RPC" }>;
  pairs: string[];
  quoteTtlMs: number;
  defaults: { notionalUsd: number; slippageBps: number };
};
export function bookFromReserves(input: {
  reserveBase: number;
  reserveQuote: number;
  feeBps: number;
  gasUsd: number;
}): { bid: number; ask: number; liquidityUsd: number; gasUsd: number } | null;
export function loadLiveBooks(): Promise<{
  books: Record<string, Record<string, { bid: number; ask: number; liquidityUsd: number; gasUsd: number }>>;
  venues: Array<{ id: string; name: string; chain: string; feeBps: number; kind: string }>;
  gasUsd: number;
  bnbUsd: number;
  source: "BSC-RPC";
}>;
export function scanLiveChain(chainId: string, now?: number, notionalUsd?: number): Promise<{
  source: "BSC-RPC";
  mode: string;
  execute: false;
  chain: string;
  chainLabel: string;
  notionalUsd: number;
  scannedAt: number;
  quoteTtlMs: number;
  venues: Array<{ id: string; name: string; chain: string; feeBps: number; kind: string; source: "BSC-RPC" }>;
  quotes: RadarQuote[];
  opportunities: RadarOpportunity[];
  bnbUsd: number;
  gasUsd: number;
}>;
