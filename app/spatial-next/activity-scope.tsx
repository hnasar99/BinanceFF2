"use client";

import { useEffect, useRef } from "react";
import type { MouseEvent } from "react";
import { OPS_AGENTS, rosterAgent, sectorFor } from "@/lib/ops-sim";
import { useSpatialI18n } from "../spatial/i18n-context";
import { useOps } from "./ops-context";

const SECTOR_LABELS = ["BNB", "ANALYZE", "CMD", "ROUTE", "SETTLE", "RISK"];

function angleOf(sector: number) {
  return -Math.PI / 2 + (sector / 6) * Math.PI * 2;
}

function hexRgb(hex: string) {
  const value = hex.replace("#", "");
  const n = Number.parseInt(value.length === 3 ? value.split("").map((c) => c + c).join("") : value, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

type Ping = {
  id: string;
  sector: number;
  color: string;
  agentId: string;
  born: number;
  ghost?: boolean;
};

export function ActivityScope() {
  const { world, select } = useOps();
  const { t } = useSpatialI18n();
  const tRef = useRef(t);
  tRef.current = t;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef(world);
  const pingsRef = useRef<Ping[]>([]);
  const seenRef = useRef(new Set<string>());
  const sweepRef = useRef(0);
  const bootedRef = useRef(false);
  worldRef.current = world;

  useEffect(() => {
    if (!bootedRef.current) {
      for (const event of world.events) seenRef.current.add(event.id);
      bootedRef.current = true;
      return;
    }
    const latest = world.events[0];
    if (latest && !seenRef.current.has(latest.id)) {
      seenRef.current.add(latest.id);
      const agent = rosterAgent(latest.agentId);
      pingsRef.current.push({
        id: latest.id,
        sector: latest.sector ?? sectorFor(latest.agentId),
        color: agent.accent,
        agentId: latest.agentId,
        born: performance.now(),
      });
      if (pingsRef.current.length > 24) pingsRef.current = pingsRef.current.slice(-24);
    }
  }, [world.events]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let running = true;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    observer?.observe(canvas);

    const draw = (now: number) => {
      if (!running) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w < 8 || h < 8) {
        raf = window.requestAnimationFrame(draw);
        return;
      }
      const cx = w / 2;
      const cy = h * 0.52;
      const radius = Math.max(8, Math.min(w, h) * 0.38);
      const snapshot = worldRef.current;
      const caution = Boolean(snapshot.gate);
      const kill = snapshot.radar.decision === "KILL" || snapshot.compliance.mandate === "REVOKED";
      const scanning = snapshot.radar.scanning;
      sweepRef.current += reduced ? 0 : scanning ? 0.045 : 0.012;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#02050c";
      ctx.fillRect(0, 0, w, h);

      const veil = ctx.createRadialGradient(cx, cy, radius * 0.12, cx, cy, radius * 1.65);
      veil.addColorStop(0, kill ? "rgba(48,8,10,.45)" : caution ? "rgba(48,32,4,.4)" : "rgba(4,18,32,.35)");
      veil.addColorStop(1, "rgba(2,5,12,0)");
      ctx.fillStyle = veil;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.65, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = caution ? "rgba(243,186,47,.28)" : "rgba(53,231,255,.16)";
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i += 1) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * (i / 4), 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let s = 0; s < 6; s += 1) {
        const a = angleOf(s);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
        ctx.strokeStyle = "rgba(255,255,255,.06)";
        ctx.stroke();
        ctx.fillStyle = "rgba(200,220,235,.7)";
        ctx.font = `${Math.max(8, Math.round(Math.min(w, h) * 0.045))}px ui-sans-serif, system-ui`;
        ctx.textAlign = "center";
        ctx.fillText(tRef.current(SECTOR_LABELS[s]), cx + Math.cos(a) * radius * 1.12, cy + Math.sin(a) * radius * 1.12);
      }

      if (!reduced) {
        const sweep = sweepRef.current;
        const grad = ctx.createConicGradient(sweep, cx, cy);
        grad.addColorStop(0, "rgba(53,231,255,0)");
        grad.addColorStop(0.08, scanning ? "rgba(243,186,47,.28)" : "rgba(53,231,255,.16)");
        grad.addColorStop(0.14, "rgba(53,231,255,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (caution) {
        const pulse = 0.35 + Math.sin(now / 180) * 0.2;
        ctx.strokeStyle = `rgba(243,186,47,${reduced ? 0.7 : pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.04, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (kill) {
        ctx.strokeStyle = `rgba(255,82,82,${reduced ? 0.7 : 0.45 + Math.sin(now / 120) * 0.25})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.2, 0, Math.PI * 2);
        ctx.stroke();
      }

      const incoming = snapshot.incoming;
      if (incoming) {
        const a = angleOf(incoming.sector);
        const x = cx + Math.cos(a) * radius * 0.72;
        const y = cy + Math.sin(a) * radius * 0.72;
        ctx.strokeStyle = "rgba(255,255,255,.35)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const routes = Math.min(8, snapshot.radar.routes);
      for (let i = 0; i < routes; i += 1) {
        const a = angleOf(0) + (i - routes / 2) * 0.12;
        const x = cx + Math.cos(a) * radius * (0.55 + (i % 3) * 0.08);
        const y = cy + Math.sin(a) * radius * (0.55 + (i % 3) * 0.08);
        ctx.fillStyle = snapshot.radar.decision === "KILL" ? "rgba(255,90,90,.7)" : "rgba(243,186,47,.7)";
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      const alive: Ping[] = [];
      for (const ping of pingsRef.current) {
        const age = now - ping.born;
        if (age > 2400 && !reduced) continue;
        const a = angleOf(ping.sector);
        const x = cx + Math.cos(a) * radius * 0.72;
        const y = cy + Math.sin(a) * radius * 0.72;
        const rgb = hexRgb(ping.color);
        const expand = Math.max(1, reduced ? 16 : 8 + Math.max(0, age) / 28);
        const alpha = reduced ? 0.45 : Math.max(0, 0.7 - age / 2400);
        ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, expand, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.55 + alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        if (snapshot.selectedId === ping.agentId) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, 9, 0, Math.PI * 2);
          ctx.stroke();
        }
        alive.push(ping);
      }
      pingsRef.current = alive;

      ctx.fillStyle = "rgba(243,186,47,.9)";
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();

      raf = window.requestAnimationFrame(draw);
    };
    raf = window.requestAnimationFrame(draw);

    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      observer?.disconnect();
    };
  }, []);

  const onClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height * 0.52;
    const dx = x - cx;
    const dy = y - cy;
    const ang = Math.atan2(dy, dx);
    let best = 0;
    let bestDelta = 99;
    for (let s = 0; s < 6; s += 1) {
      let d = Math.abs(ang - angleOf(s));
      if (d > Math.PI) d = Math.PI * 2 - d;
      if (d < bestDelta) {
        bestDelta = d;
        best = s;
      }
    }
    const agent = OPS_AGENTS.find((item) => sectorFor(item.id) === best);
    if (agent) select(agent.id);
  };

  return (
    <canvas
      ref={canvasRef}
      className="cockpit-scope"
      aria-label={t("Opportunity radar. Click a sector to bring that agent on stage.")}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") event.preventDefault();
      }}
    />
  );
}
