"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock3,
  Radio,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { catalog, type RadarOpportunity, type RadarRisk, type RadarSimulation } from "@/lib/radar";

type ScanPayload = {
  chain: string;
  chainLabel: string;
  source: string;
  execute: boolean;
  notionalUsd: number;
  scannedAt: number;
  quoteTtlMs: number;
  venues: Array<{ id: string; name: string; feeBps: number; source: string }>;
  opportunities: RadarOpportunity[];
  persisted?: boolean;
  error?: string;
};

type SimPayload = {
  opportunity: RadarOpportunity;
  simulation: RadarSimulation;
  risk: RadarRisk;
  execute: boolean;
  error?: string;
};

const money = (value: number, digits = 2) =>
  `${value < 0 ? "-" : ""}${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export function OpportunityRadar() {
  const meta = catalog();
  const [chain, setChain] = useState("bnb-smart-chain");
  const [notional, setNotional] = useState(String(meta.defaults.notionalUsd));
  const [scan, setScan] = useState<ScanPayload | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [simulation, setSimulation] = useState<SimPayload | null>(null);
  const [loading, setLoading] = useState<"idle" | "scan" | "simulate">("idle");
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedOpportunity = scan?.opportunities.find((item) => item.publicCode === selected) || null;
  const remainingMs = selectedOpportunity ? Math.max(0, selectedOpportunity.expiresAt - now) : 0;

  const stats = useMemo(() => {
    if (!scan) return { routes: 0, approved: 0, killed: 0, best: 0 };
    if (!simulation) return { routes: scan.opportunities.length, approved: 0, killed: 0, best: 0 };
    return {
      routes: scan.opportunities.length,
      approved: simulation.risk.decision === "APPROVE" ? 1 : 0,
      killed: simulation.risk.decision === "KILL" ? 1 : 0,
      best: simulation.simulation.netUsd,
    };
  }, [scan, simulation]);

  const runScan = async (nextChain = chain) => {
    setLoading("scan");
    setError("");
    setSimulation(null);
    try {
      const response = await fetch(`/api/radar?chain=${encodeURIComponent(nextChain)}&notionalUsd=${Number(notional) || 2000}`, { cache: "no-store" });
      const data = (await response.json()) as ScanPayload & { catalog?: unknown };
      if (!response.ok) throw new Error(data.error || "Scan failed");
      setScan(data);
      setSelected(data.opportunities[0]?.publicCode || "");
      setChain(nextChain);
    } catch (reason) {
      setScan(null);
      setSelected("");
      setError(reason instanceof Error ? reason.message : "Scan failed");
    } finally {
      setLoading("idle");
    }
  };

  const runSimulate = async (publicCode: string) => {
    setLoading("simulate");
    setError("");
    try {
      const response = await fetch("/api/radar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "simulate", chain, publicCode, notionalUsd: Number(notional) || 2000 }),
      });
      const data = (await response.json()) as SimPayload;
      if (!response.ok) throw new Error(data.error || "Simulation failed");
      setSimulation(data);
      setSelected(publicCode);
    } catch (reason) {
      setSimulation(null);
      setError(reason instanceof Error ? reason.message : "Simulation failed");
    } finally {
      setLoading("idle");
    }
  };

  return (
    <div className="page radar-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">OPPORTUNITY RADAR // BSC RPC</span>
          <h1>See the spread. Keep the keys.</h1>
          <p>
            NEXUS reads live PancakeSwap, ApeSwap and THENA reserves, VECTOR nets fees, gas and slippage, AEGIS
            approves or kills the route. Execution stays locked.
          </p>
        </div>
        <Button className="deploy-btn" onClick={() => void runScan()} disabled={loading !== "idle"}>
          {loading === "scan" ? "SCANNING…" : "SCAN VENUES"}
        </Button>
      </div>

      <div className="radar-banner">
        <Radio />
        <div>
          <b>Live BSC RPC · observe → quote → simulate → risk</b>
          <span>Reserves come from chain 56. No execute. A missing pair is omitted, never invented.</span>
        </div>
      </div>

      <div className="filter-bar radar-filters">
        {meta.chains.map((item) => (
          <button
            key={item.id}
            className={chain === item.id ? "active" : ""}
            disabled={item.status !== "live" || loading !== "idle"}
            onClick={() => {
              setChain(item.id);
              if (item.status === "live") void runScan(item.id);
            }}
          >
            {item.label.toUpperCase()}
            {item.status !== "live" && <i>READY</i>}
          </button>
        ))}
        <label>
          NOTIONAL USDT
          <input
            type="number"
            min={100}
            step={100}
            value={notional}
            onChange={(event) => setNotional(event.target.value)}
          />
        </label>
      </div>

      <section className="pulse-grid radar-pulse">
        <article>
          <span>VENUES LIVE</span>
          <b>{scan ? scan.venues.length : "—"}</b>
          <small>{scan ? scan.venues.map((venue) => venue.name).join(" · ") : "PancakeSwap · ApeSwap · THENA"}</small>
        </article>
        <article>
          <span>ROUTES FOUND</span>
          <b>{scan ? stats.routes : "—"}</b>
          <small>{scan ? `${scan.chainLabel} · ${scan.source}` : "Scan to populate"}</small>
        </article>
        <article>
          <span>LAST NET</span>
          <b className={stats.best > 0 ? "up" : ""}>{scan && simulation ? `${money(stats.best)}` : "—"}</b>
          <small>USDT after costs</small>
        </article>
        <article>
          <span>EXECUTION</span>
          <b>LOCKED</b>
          <small>Read · simulate · propose</small>
        </article>
      </section>

      {error && (
        <div className="radar-error">
          <AlertTriangle />
          <div>
            <b>Scan blocked</b>
            <span>{error}</span>
          </div>
        </div>
      )}

      {!scan && !error && (
        <div className="empty-state">
          <Radio />
          <h3>No quotes yet</h3>
          <p>Scan BNB Smart Chain to pull live books from PancakeSwap, ApeSwap and THENA. Quotes expire in 45 seconds.</p>
        </div>
      )}

      {scan && scan.opportunities.length === 0 && (
        <div className="empty-state">
          <Clock3 />
          <h3>No positive spreads in this book</h3>
          <p>Live venues returned no buy-low / sell-high pairs for the selected chain.</p>
        </div>
      )}

      {scan && scan.opportunities.length > 0 && (
        <div className="radar-shell">
          <section className="radar-list">
            <div className="panel-title">
              <span>CROSS-VENUE ROUTES</span>
              <small>{scan.opportunities.length} OPEN</small>
            </div>
            {scan.opportunities.map((item) => {
              const ttl = Math.max(0, item.expiresAt - now);
              const active = selected === item.publicCode;
              return (
                <button
                  key={item.publicCode}
                  className={`radar-row ${active ? "active" : ""}`}
                  onClick={() => {
                    setSelected(item.publicCode);
                    setSimulation(null);
                  }}
                >
                  <div>
                    <b>{item.pair}</b>
                    <span>
                      Buy {item.buyVenueName} · Sell {item.sellVenueName}
                    </span>
                  </div>
                  <em>{money(item.spreadUsd, 3)} USDT</em>
                  <small>{Math.ceil(ttl / 1000)}s</small>
                </button>
              );
            })}
          </section>

          <aside className="radar-detail">
            {selectedOpportunity ? (
              <>
                <div className="panel-title">
                  <span>{selectedOpportunity.publicCode}</span>
                  <small className={remainingMs > 0 ? "live" : ""}>{remainingMs > 0 ? "QUOTE LIVE" : "EXPIRED"}</small>
                </div>
                <h3>
                  {selectedOpportunity.buyVenueName} → {selectedOpportunity.sellVenueName}
                </h3>
                <p>
                  {selectedOpportunity.pair} on BNB Smart Chain · {money(Number(notional) || 2000, 0)} USDT notional
                </p>
                <div className="mandate-row">
                  <span>Buy ask</span>
                  <b>{money(selectedOpportunity.buyPriceUsd, 4)} · {selectedOpportunity.buyQuote.feeBps} bps</b>
                </div>
                <div className="mandate-row">
                  <span>Sell bid</span>
                  <b>{money(selectedOpportunity.sellPriceUsd, 4)} · {selectedOpportunity.sellQuote.feeBps} bps</b>
                </div>
                <div className="mandate-row">
                  <span>Quote TTL</span>
                  <b>{Math.ceil(remainingMs / 1000)}s · stale quotes auto-kill</b>
                </div>
                <div className="mandate-row">
                  <span>Liquidity</span>
                  <b>
                    {money(selectedOpportunity.buyQuote.liquidityUsd, 0)} / {money(selectedOpportunity.sellQuote.liquidityUsd, 0)} USDT
                  </b>
                </div>
                <Button
                  className="deploy-btn radar-simulate"
                  disabled={loading !== "idle" || remainingMs === 0}
                  onClick={() => void runSimulate(selectedOpportunity.publicCode)}
                >
                  {loading === "simulate" ? "SIMULATING…" : "SIMULATE NET ROUTE"} <ArrowRight />
                </Button>

                {simulation && simulation.opportunity.publicCode === selectedOpportunity.publicCode && (
                  <div className={`radar-verdict ${simulation.risk.decision === "APPROVE" ? "approve" : "kill"}`}>
                    <div className="panel-title">
                      <span>VECTOR + AEGIS</span>
                      <small>{simulation.risk.decision}</small>
                    </div>
                    <div className="radar-net">
                      <span>NET BENEFIT</span>
                      <b>{money(simulation.simulation.netUsd)} USDT</b>
                      <small>{simulation.simulation.netBps} bps after fees, gas and slippage</small>
                    </div>
                    {[
                      ["Gross", simulation.simulation.grossUsd],
                      ["Fees", -simulation.simulation.feesUsd],
                      ["Gas", -simulation.simulation.gasUsd],
                      ["Slippage", -simulation.simulation.slippageUsd],
                    ].map(([label, value]) => (
                      <div className="mandate-row" key={String(label)}>
                        <span>{label}</span>
                        <b>{money(Number(value))} USDT</b>
                      </div>
                    ))}
                    <div className="radar-adverse">
                      {simulation.simulation.adverse.map((item) => (
                        <div key={item.id}>
                          {item.pass ? <Check /> : <X />}
                          <span>{item.label}</span>
                          <b>{money(item.netUsd)}</b>
                        </div>
                      ))}
                    </div>
                    {simulation.risk.decision === "APPROVE" ? (
                      <div className="authority-preview">
                        <ShieldCheck />
                        <div>
                          <b>Route cleared to propose</b>
                          <span>Mandate still read / simulate / propose. Execution is not available in this cut.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="radar-kill-reasons">
                        {simulation.risk.reasons.map((reason) => (
                          <p key={reason}>{reason}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state compact-empty">
                <Clock3 />
                <h3>Select a route</h3>
                <p>Pick a pair to inspect quotes, TTL and a net simulation.</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
