"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Check, Radio, ShieldCheck, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = {
  provider: "clawpump";
  mode: "disabled" | "read-only";
  configured: boolean;
  executable: false;
  note: string;
};

type LabStep = {
  label: string;
  tool: string;
  solana: string;
  state: "ready" | "blocked";
};

const steps: LabStep[] = [
  { label: "Discover", tool: "token_search / get_price", solana: "Resolve SPL mint, decimals, liquidity", state: "ready" },
  { label: "Compare", tool: "arbitrage_prices / arbitrage_quote", solana: "Compare Jupiter, Raydium and Orca routes", state: "ready" },
  { label: "Quote", tool: "swap_quote", solana: "Build route plan, price impact and slippage envelope", state: "ready" },
  { label: "Simulate", tool: "VECTOR", solana: "Net fees + slippage + network cost + adverse cases", state: "ready" },
  { label: "Risk gate", tool: "AEGIS", solana: "Token/route policy, stale quote and economic limits", state: "ready" },
  { label: "Execute", tool: "swap_execute", solana: "Sign/send transaction and return signature", state: "blocked" },
  { label: "Verify", tool: "ORACLE", solana: "Reconcile quote vs transaction vs realized result", state: "blocked" },
];

export function SolanaTradingLab() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [inputMint, setInputMint] = useState("So11111111111111111111111111111111111111112");
  const [outputMint, setOutputMint] = useState("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  const [amount, setAmount] = useState("0.01");
  const [quote, setQuote] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/clawpump", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "ClawPump status failed");
        setStatus(data);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "ClawPump status failed"));
  }, []);

  const runQuote = async () => {
    setBusy(true);
    setError("");
    setQuote(null);
    try {
      const response = await fetch("/api/clawpump", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "swap_quote",
          inputMint,
          outputMint,
          amount: Number(amount),
          slippageBps: 50,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Quote failed");
      setQuote(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Quote failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <span className="eyebrow">SOLANA TRADING LAB // CLAWPUMP</span>
          <h1>Learn the chain by watching the agents work.</h1>
          <p>
            A transparent execution lab: ClawPump exposes the financial tools, BinanceFF explains the Solana mechanics,
            VECTOR calculates economics and AEGIS controls authority.
          </p>
        </div>
        <span className="season-chip">{status?.configured ? "CLAWPUMP CONNECTED" : "BRIDGE REQUIRED"}</span>
      </div>

      <div className="radar-banner">
        <Radio />
        <div>
          <b>{status?.mode === "read-only" ? "Read-only provider online" : "Safe mode · no fund movement"}</b>
          <span>{status?.note || "Checking ClawPump provider…"}</span>
        </div>
      </div>

      <section className="lab-flow">
        {steps.map((step, index) => (
          <article key={step.label} className={step.state === "blocked" ? "lab-step blocked" : "lab-step"}>
            <div className="lab-step-index">{String(index + 1).padStart(2, "0")}</div>
            <div>
              <span>{step.label.toUpperCase()}</span>
              <b>{step.tool}</b>
              <small>{step.solana}</small>
            </div>
            {step.state === "ready" ? <Check /> : <ShieldCheck />}
          </article>
        ))}
      </section>

      <div className="lab-grid">
        <section className="lab-panel">
          <div className="panel-title">
            <span>LIVE QUOTE WORKBENCH</span>
            <small>NO EXECUTE</small>
          </div>
          <div className="form-stack">
            <label>
              INPUT MINT · SOL
              <input value={inputMint} onChange={(e) => setInputMint(e.target.value)} />
            </label>
            <label>
              OUTPUT MINT · USDC
              <input value={outputMint} onChange={(e) => setOutputMint(e.target.value)} />
            </label>
            <label>
              INPUT AMOUNT
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
          </div>
          <Button className="deploy-btn" disabled={busy || !status?.configured} onClick={() => void runQuote()}>
            {busy ? "ASKING CLAWPUMP…" : "GET LIVE CLAWPUMP QUOTE"} <ArrowRight />
          </Button>
          {!status?.configured && (
            <div className="radar-error">
              <AlertTriangle />
              <div>
                <b>Provider not configured</b>
                <span>Configure the server-side ClawPump MCP bridge; execution stays locked.</span>
              </div>
            </div>
          )}
        </section>

        <section className="lab-panel">
          <div className="panel-title">
            <span>WHAT SOLANA IS DOING</span>
            <small>EXPLAIN MODE</small>
          </div>
          <div className="authority-console">
            <Terminal />
            <code>
              SPL mint → route discovery<br />
              Jupiter / Raydium / Orca → liquidity venues<br />
              quote → expected output + price impact<br />
              slippage_bps → execution tolerance<br />
              transaction → instructions + accounts<br />
              signature → verifiable on-chain receipt
            </code>
          </div>
          <div className="mandate-row"><span>BinanceFF authority</span><b>read · simulate · propose</b></div>
          <div className="mandate-row"><span>Fund movement</span><b>LOCKED</b></div>
          <div className="mandate-row"><span>Next gate</span><b>explicit human approval</b></div>
        </section>
      </div>

      {error && (
        <div className="radar-error">
          <AlertTriangle />
          <div><b>Lab request blocked</b><span>{error}</span></div>
        </div>
      )}

      {quote !== null && (
        <section className="lab-panel lab-output">
          <div className="panel-title"><span>CLAWPUMP RESPONSE</span><small>RAW + AUDITABLE</small></div>
          <pre>{JSON.stringify(quote, null, 2)}</pre>
        </section>
      )}
    </div>
  );
}
