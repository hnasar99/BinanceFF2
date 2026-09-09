"use client";

import { rosterAgent } from "@/lib/ops-sim";
import { useSpatialI18n } from "../spatial/i18n-context";
import { useOps } from "./ops-context";

const BOARD = [
  {
    id: "B-2048",
    title: "Map BNB liquidity routes",
    reward: "2,400 USDT",
    status: "LIVE",
    squad: ["scout", "analyst", "commander", "strategist", "executor", "guardian"],
  },
  {
    id: "B-2047",
    title: "Audit milestone escrow",
    reward: "1,850 USDT",
    status: "BIDDING",
    squad: ["guardian", "analyst", "executor"],
  },
  {
    id: "B-2046",
    title: "Build on-chain reputation index",
    reward: "3,200 USDT",
    status: "BIDDING",
    squad: ["strategist", "scout", "commander"],
  },
  {
    id: "M-8819",
    title: "Escrow security review",
    reward: "2,150 USDT",
    status: "REVIEW",
    squad: ["guardian", "analyst", "executor"],
  },
  {
    id: "M-8816",
    title: "Agent matching benchmark",
    reward: "1,200 USDT",
    status: "DONE",
    squad: ["scout", "strategist", "executor"],
  },
];

export function BountyDock() {
  const { world, select, deploy } = useOps();
  const { t, line } = useSpatialI18n();
  const liveTitle = world.mission?.title;

  const rows = BOARD.map((item) => {
    if (item.id === "B-2048" && world.mission) {
      return {
        ...item,
        id: world.mission.id,
        title: world.mission.title,
        reward: world.mission.reward,
        status: world.mission.status === "killed" ? "KILLED" : world.mission.status === "settled" ? "DONE" : world.running ? "LIVE" : "HOLD",
        squad: world.assigned.length ? world.assigned : item.squad,
        progress: world.compliance.completionPct,
      };
    }
    return { ...item, progress: item.status === "DONE" ? 100 : item.status === "REVIEW" ? 92 : 0 };
  });

  return (
    <footer className="bounty-dock">
      <div className="dock-label">
        <span>{t("Bounties & squads")}</span>
        <small>{t("{n} live", { n: rows.filter((row) => row.status === "LIVE").length })}</small>
      </div>
      <div className="bounty-scroller">
        {rows.map((row) => (
          <article key={row.id} className={`bounty-chip is-${row.status.toLowerCase()}${liveTitle === row.title ? " is-here" : ""}`}>
            <header>
              <b>{row.id}</b>
              <em>{t(row.status)}</em>
            </header>
            <p>{line(row.title)}</p>
            <strong>{row.reward}</strong>
            <div className="chip-squad">
              {row.squad.map((id) => {
                const agent = rosterAgent(id);
                return (
                  <button
                    type="button"
                    key={id}
                    title={agent.name}
                    onClick={() => select(id)}
                  >
                    <img src={agent.portrait} alt={agent.name} />
                  </button>
                );
              })}
            </div>
            {row.progress ? <i className="chip-bar"><em style={{ width: `${row.progress}%` }} /></i> : null}
            {row.status === "BIDDING" && !world.mission ? (
              <button type="button" className="chip-go" onClick={() => deploy(row.title)}>{t("Take bounty")}</button>
            ) : null}
          </article>
        ))}
      </div>
    </footer>
  );
}
