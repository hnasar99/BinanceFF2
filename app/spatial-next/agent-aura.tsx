"use client";

import { useEffect, useRef } from "react";

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  const n = Number.parseInt(value.length === 3 ? value.split("").map((c) => c + c).join("") : value, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function AgentAura({ accent, selected = false }: { accent: string; selected?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const color = hexToRgb(accent);
    const particles = Array.from({ length: selected ? 42 : 26 }, () => ({
      x: Math.random(),
      y: Math.random(),
      s: 0.4 + Math.random() * 1.6,
      v: 0.08 + Math.random() * 0.22,
      a: 0.25 + Math.random() * 0.55,
    }));

    let frame = 0;
    let raf = 0;
    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      frame += 1;
      const boost = selected ? 1.35 : 1;

      ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${selected ? 0.28 : 0.14})`;
      ctx.lineWidth = 1.2;
      const ring = 18 + Math.sin(frame * 0.03) * 4;
      ctx.beginPath();
      ctx.ellipse(width / 2, height * 0.78, width * 0.34 + ring * 0.15, 10 + ring * 0.12, 0, 0, Math.PI * 2);
      ctx.stroke();

      for (const p of particles) {
        p.y -= p.v * 0.012 * boost;
        if (p.y < -0.05) {
          p.y = 1.05;
          p.x = 0.18 + Math.random() * 0.64;
        }
        const px = p.x * width + Math.sin(frame * 0.04 + p.x * 8) * 6;
        const py = p.y * height;
        const g = ctx.createRadialGradient(px, py, 0, px, py, 7 * p.s);
        g.addColorStop(0, `rgba(${color.r},${color.g},${color.b},${p.a * boost})`);
        g.addColorStop(1, `rgba(${color.r},${color.g},${color.b},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, 7 * p.s, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = window.requestAnimationFrame(draw);
    };

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(box.width * ratio));
      canvas.height = Math.max(1, Math.floor(box.height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    raf = window.requestAnimationFrame(draw);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(raf);
    };
  }, [accent, selected]);

  return <canvas ref={canvasRef} className="agent-aura-canvas" aria-hidden="true" />;
}
