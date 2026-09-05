"use client";

import { useEffect } from "react";
import { preloadGamifiedEngine, useGamifiedProgress } from "./spatial/preload";

export function GamifiedEntry({ compact = false }: { compact?: boolean }) {
  const progress = useGamifiedProgress();

  useEffect(() => {
    void preloadGamifiedEngine();
  }, []);

  if (!progress.ready) {
    return (
      <button
        type="button"
        className={`spatial-entry is-loading${compact ? " spatial-entry-inline" : ""}`}
        disabled
        aria-busy="true"
        aria-label="Loading Gamified Experience"
      >
        <i style={{ width: `${progress.percent}%` }} />
        <span>LOADING GAMIFIED EXPERIENCE</span>
      </button>
    );
  }

  return (
    <a
      className={`spatial-entry is-ready${compact ? " spatial-entry-inline" : ""}`}
      href="/spatial"
      title="Enter the gamified spatial layer"
      aria-label="Enter gamified WebGL interface"
    >
      {compact ? "ENTER GAMIFIED EXPERIENCE" : "GAMIFIED"}
    </a>
  );
}
