"use client";

import { useEffect, useMemo, useState } from "react";

const FEED = [
  "MASTER // decomposing mission graph",
  "ARBITRUM // liquidity scan completed",
  "RISK // route simulation passed",
  "BNB // new deployment signal detected",
  "BASE // watcher synchronized",
  "NEXUS // execution fabric standing by",
];

export function CinematicOverlay() {
  const [pulse, setPulse] = useState(0);
  const [tick, setTick] = useState(0);
  const visibleFeed = useMemo(() => {
    return Array.from({ length: 4 }, (_, index) => FEED[(tick + index) % FEED.length]);
  }, [tick]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 2200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="nexus-cinematic" aria-hidden="true">
      <div className="nexus-vignette" />
      <div className="nexus-scanlines" />
      <div className="nexus-reticle nexus-reticle-tl" />
      <div className="nexus-reticle nexus-reticle-tr" />
      <div className="nexus-reticle nexus-reticle-bl" />
      <div className="nexus-reticle nexus-reticle-br" />

      <section className="nexus-feed">
        <div className="nexus-feed-kicker">LIVE MISSION BUS</div>
        {visibleFeed.map((item, index) => (
          <div className="nexus-feed-row" key={`${item}-${tick}-${index}`}>
            <span className="nexus-feed-dot" />
            <span>{item}</span>
          </div>
        ))}
      </section>

      <section className="nexus-topology">
        <div>
          <strong>07</strong>
          <span>AGENTS</span>
        </div>
        <i />
        <div>
          <strong>04</strong>
          <span>CHAINS</span>
        </div>
        <i />
        <div>
          <strong>12</strong>
          <span>EVENTS/S</span>
        </div>
      </section>

      <button
        type="button"
        className={`nexus-pulse${pulse ? " is-active" : ""}`}
        onClick={() => {
          setPulse((value) => value + 1);
          window.setTimeout(() => setPulse(0), 900);
        }}
        aria-hidden="false"
      >
        <span>SIMULATE NETWORK PULSE</span>
        <b>{pulse ? "PULSE SENT" : "READY"}</b>
      </button>

      {pulse ? <div className="nexus-pulse-wave" key={pulse} /> : null}
    </div>
  );
}
