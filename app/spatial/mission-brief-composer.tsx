"use client";

import { useMemo, useState } from "react";

type Difficulty = "EXPERT" | "ELITE" | "LEGENDARY";

type ApiResult = {
  bounty?: { publicCode?: string };
  mission?: { publicCode?: string };
  error?: string;
};

const FLASH_BRIEF = `Build an autonomous multi-agent squad that discovers, evaluates, simulates and executes profitable DeFi arbitrage opportunities using owned liquidity or flash loans. The squad should monitor selected DEX liquidity pools, construct candidate routes, estimate gas, DEX fees, slippage and flash-loan fees, simulate the complete atomic transaction, reject unprofitable or unsafe routes, execute only when expected net profit is above the configured threshold, and report realized P&L with reproducible evidence.`;

const FLASH_CRITERIA = `1. Detect at least one valid arbitrage opportunity across approved DEX pools.\n2. Produce the full proposed route and expected gross return.\n3. Simulate the transaction before execution.\n4. Include gas, DEX fees, slippage and flash-loan fees in profitability.\n5. Execute atomically or revert when minimum profit cannot be achieved.\n6. Provide transaction evidence and final realized net P&L.\n7. Bonus: complete discovery, simulation, execution and reporting without human intervention.`;

export function MissionBriefComposer() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("DeFi Flash Arbitrage Squad");
  const [brief, setBrief] = useState(FLASH_BRIEF);
  const [criteria, setCriteria] = useState(FLASH_CRITERIA);
  const [reward, setReward] = useState("1200");
  const [difficulty, setDifficulty] = useState<Difficulty>("ELITE");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const ready = useMemo(
    () => title.trim().length > 0 && brief.trim().length > 0 && criteria.trim().length > 0 && Number(reward) > 0,
    [title, brief, criteria, reward],
  );

  async function publishAndDeploy() {
    if (!ready || busy) return;
    setBusy(true);
    setStatus("Publishing bounty…");
    try {
      const bountyResponse = await fetch("/api/state", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create_bounty",
          title: title.trim(),
          acceptanceCriteria: `${brief.trim()}\n\nACCEPTANCE CRITERIA\n${criteria.trim()}`,
          rewardAmount: Number(reward),
          rewardAsset: "USDT",
          difficulty,
          skills: ["defi", "arbitrage", "flash-loans", "simulation", "risk", "execution"],
        }),
      });
      const bountyData = (await bountyResponse.json()) as ApiResult;
      if (!bountyResponse.ok) throw new Error(bountyData.error || "Could not publish bounty");

      setStatus(`${bountyData.bounty?.publicCode || "BOUNTY"} published · assembling squad…`);
      const missionResponse = await fetch("/api/state", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "deploy_mission",
          name: title.trim(),
          intent: `${brief.trim()}\n\nACCEPTANCE CRITERIA\n${criteria.trim()}`,
        }),
      });
      const missionData = (await missionResponse.json()) as ApiResult;
      if (!missionResponse.ok) throw new Error(missionData.error || "Bounty published, but squad deployment failed");

      setStatus(`${bountyData.bounty?.publicCode || "BOUNTY"} → ${missionData.mission?.publicCode || "MISSION"} LIVE`);
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unexpected deployment error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: "fixed", right: 18, bottom: 18, zIndex: 80, fontFamily: "Inter, system-ui, sans-serif", color: "#fff" }}>
      {open && (
        <section
          style={{
            width: "min(520px, calc(100vw - 28px))",
            maxHeight: "min(760px, calc(100vh - 110px))",
            overflowY: "auto",
            padding: 18,
            marginBottom: 10,
            border: "1px solid #35e7ff66",
            borderRadius: 14,
            background: "linear-gradient(145deg, rgba(5,10,18,.98), rgba(9,18,31,.97))",
            boxShadow: "0 0 42px rgba(53,231,255,.12), 0 18px 70px rgba(0,0,0,.6)",
            backdropFilter: "blur(18px)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <div>
              <div style={{ color: "#35e7ff", letterSpacing: 1.5, fontSize: 11, fontWeight: 800 }}>BOUNTY FORGE · LONG-FORM MISSION</div>
              <h2 style={{ margin: "5px 0 3px", fontSize: 22 }}>Publish a real squad objective</h2>
              <p style={{ margin: 0, color: "#91a0b8", fontSize: 13, lineHeight: 1.45 }}>The title stays compact in the 3D world. The squad receives the complete brief and acceptance criteria.</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close bounty composer" style={iconButton}>×</button>
          </div>

          <label style={labelStyle}>MISSION TITLE <span style={{ color: title.length > 64 ? "#ff7a7a" : "#91a0b8" }}>{title.length}/64</span></label>
          <input value={title} maxLength={64} onChange={(event) => setTitle(event.target.value)} style={inputStyle} />

          <label style={labelStyle}>MISSION BRIEF <span style={{ color: "#91a0b8" }}>{brief.length}/4000</span></label>
          <textarea value={brief} maxLength={4000} rows={7} onChange={(event) => setBrief(event.target.value)} style={textareaStyle} />

          <label style={labelStyle}>ACCEPTANCE CRITERIA <span style={{ color: "#91a0b8" }}>{criteria.length}/2500</span></label>
          <textarea value={criteria} maxLength={2500} rows={7} onChange={(event) => setCriteria(event.target.value)} style={textareaStyle} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>REWARD · USDT</label>
              <input type="number" min="1" step="1" value={reward} onChange={(event) => setReward(event.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>DIFFICULTY</label>
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)} style={inputStyle}>
                <option value="EXPERT">EXPERT</option>
                <option value="ELITE">ELITE</option>
                <option value="LEGENDARY">LEGENDARY</option>
              </select>
            </div>
          </div>

          <button disabled={!ready || busy} onClick={() => void publishAndDeploy()} style={{ ...deployButton, opacity: !ready || busy ? 0.55 : 1 }}>
            {busy ? "ASSEMBLING SQUAD…" : "PUBLISH BOUNTY + DEPLOY SQUAD →"}
          </button>
          {status && <div style={{ marginTop: 9, color: status.includes("LIVE") ? "#4df0a0" : "#f3ba2f", fontSize: 12, fontWeight: 700 }}>{status}</div>}
        </section>
      )}

      <button onClick={() => setOpen((value) => !value)} style={launcherStyle}>
        <span style={{ color: "#35e7ff" }}>◎</span> {open ? "CLOSE FORGE" : "NEW BOUNTY"}
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", margin: "14px 0 6px", color: "#f3ba2f", letterSpacing: 1.1, fontSize: 10, fontWeight: 800 };
const inputStyle: React.CSSProperties = { boxSizing: "border-box", width: "100%", minHeight: 42, border: "1px solid #34465f", borderRadius: 8, outline: "none", padding: "10px 11px", background: "#030812", color: "#fff", fontSize: 13 };
const textareaStyle: React.CSSProperties = { ...inputStyle, resize: "vertical", minHeight: 112, lineHeight: 1.45 };
const iconButton: React.CSSProperties = { width: 32, height: 32, flex: "0 0 auto", borderRadius: 8, border: "1px solid #34465f", background: "#09101b", color: "#fff", cursor: "pointer", fontSize: 20 };
const deployButton: React.CSSProperties = { width: "100%", minHeight: 46, marginTop: 15, border: "1px solid #f3ba2f", borderRadius: 8, background: "#f3ba2f", color: "#07080b", cursor: "pointer", fontWeight: 900, letterSpacing: 0.4 };
const launcherStyle: React.CSSProperties = { float: "right", height: 44, padding: "0 15px", borderRadius: 9, border: "1px solid #35e7ff88", background: "rgba(5,10,18,.94)", boxShadow: "0 0 26px rgba(53,231,255,.14)", color: "#fff", cursor: "pointer", fontWeight: 850, letterSpacing: 0.8 };
