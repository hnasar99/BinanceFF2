"use client";

import { useEffect, useRef } from "react";
import { fitVisemesToDuration, textToVisemes, visemeAt } from "@/lib/kai-lipsync";

export type SpeechCue = { id: number; agentId: string; text: string; durationMs?: number };

function coverDraw(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.width, height / image.height);
  const dw = image.width * scale;
  const dh = image.height * scale;
  const dx = (width - dw) / 2;
  const dy = (height - dh) * 0.16;
  ctx.drawImage(image, dx, dy, dw, dh);
  return { dx, dy, dw, dh };
}

export function SpeakingPortrait({
  src,
  alt,
  mouthLine = 0.41,
  rate = 0.95,
  speech = null,
  speaking = false,
}: {
  src: string;
  alt: string;
  mouthLine?: number;
  rate?: number;
  speech?: SpeechCue | null;
  speaking?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const poseRef = useRef({ open: 0, width: 1 });

  useEffect(() => {
    const image = new Image();
    image.src = src;
    imageRef.current = image;
    const ready = () => {
      imageRef.current = image;
    };
    if (image.complete) ready();
    else image.addEventListener("load", ready, { once: true });
    return () => image.removeEventListener("load", ready);
  }, [src]);

  const originRef = useRef(0);

  useEffect(() => {
    originRef.current = 0;
  }, [speech?.id]);

  useEffect(() => {
    if (!speaking || !speech?.text) {
      poseRef.current = { open: 0, width: 1 };
      originRef.current = 0;
      return;
    }
    if (!originRef.current) originRef.current = performance.now();
    const raw = textToVisemes(speech.text, rate);
    const track = speech.durationMs ? fitVisemesToDuration(raw, speech.durationMs) : raw;
    const origin = originRef.current;
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - origin;
      const pose = visemeAt(track, elapsed);
      poseRef.current = { open: pose.openness, width: pose.width };
      if (elapsed <= (track.at(-1)?.endMs ?? 0) + 180) raf = window.requestAnimationFrame(tick);
      else poseRef.current = { open: 0, width: 1 };
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [speaking, speech?.id, speech?.text, speech?.durationMs, rate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const draw = () => {
      const box = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(box.width));
      const height = Math.max(1, Math.floor(box.height));
      if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
        canvas.width = Math.floor(width * ratio);
        canvas.height = Math.floor(height * ratio);
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const image = imageRef.current;
      if (image && image.complete && image.naturalWidth) {
        const { open, width: mouthWidth } = poseRef.current;
        const laid = coverDraw(ctx, image, width, height);
        if (open > 0.04) {
          const seam = laid.dy + laid.dh * mouthLine;
          const drop = Math.min(height * 0.05, 16) * open;
          const mid = width / 2;
          const slot = width * (0.2 + (mouthWidth - 1) * 0.08);

          ctx.save();
          ctx.beginPath();
          ctx.rect(0, seam, width, height - seam);
          ctx.clip();
          ctx.clearRect(0, seam, width, height - seam);
          ctx.drawImage(image, laid.dx, laid.dy + drop, laid.dw, laid.dh);
          ctx.restore();

          const cavity = ctx.createLinearGradient(0, seam, 0, seam + drop + 2);
          cavity.addColorStop(0, "rgba(20,6,8,0.18)");
          cavity.addColorStop(0.45, "rgba(28,8,10,0.82)");
          cavity.addColorStop(1, "rgba(10,3,4,0.55)");
          ctx.fillStyle = cavity;
          ctx.fillRect(mid - slot / 2, seam - 1, slot, drop + 3);
        }
      }

      raf = window.requestAnimationFrame(draw);
    };
    raf = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(raf);
  }, [mouthLine]);

  return <canvas ref={canvasRef} className="agent-speaking-portrait" aria-label={alt} />;
}
