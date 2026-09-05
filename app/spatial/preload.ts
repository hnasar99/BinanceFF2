"use client";

import { useEffect, useState } from "react";
import type { FontFamilies } from "@pmndrs/uikit";
import { HUD_FONT_INPUT, wrapFontResult } from "./font-source";

export type GamifiedProgress = {
  percent: number;
  label: string;
  ready: boolean;
};

type Listener = (progress: GamifiedProgress) => void;

const listeners = new Set<Listener>();
let progress: GamifiedProgress = { percent: 8, label: "Loading Gamified Experience", ready: false };
let fonts: FontFamilies | null = null;
let task: Promise<void> | null = null;

function emit(percent: number, label: string, ready = false) {
  progress = {
    percent: Math.max(progress.percent, Math.min(100, Math.round(percent))),
    label,
    ready,
  };
  listeners.forEach((listener) => listener(progress));
}

export function getPreloadedFonts() {
  return fonts;
}

export function getGamifiedProgress() {
  return progress;
}

export function subscribeGamifiedProgress(listener: Listener) {
  listeners.add(listener);
  listener(progress);
  return () => {
    listeners.delete(listener);
  };
}

export function useGamifiedProgress() {
  const [value, setValue] = useState(progress);
  useEffect(() => subscribeGamifiedProgress(setValue), []);
  return value;
}

export function preloadGamifiedEngine() {
  if (typeof window === "undefined") return Promise.resolve();
  if (!task) {
    emit(Math.max(progress.percent, 8), "Loading Gamified Experience");
    task = boot().catch((error) => {
      task = null;
      console.warn("[gamified preload]", error);
      window.setTimeout(() => {
        void preloadGamifiedEngine();
      }, 1200);
    });
  }
  return task;
}

function pulse(target: number, label: string) {
  emit(Math.min(progress.percent + 1, target - 1), label);
  const timer = window.setInterval(() => {
    if (progress.percent >= target - 1) return;
    emit(progress.percent + 1, label);
  }, 160);
  return () => window.clearInterval(timer);
}

async function boot() {
  const stopModules = pulse(34, "Loading Gamified Experience");
  try {
    const modules = [
      import("@react-three/fiber"),
      import("@react-three/drei"),
      import("@react-three/uikit"),
      import("@react-three/uikit-default"),
      import("@react-three/postprocessing"),
      import("three"),
      import("./spatial-interface"),
    ];
    let loaded = 0;
    await Promise.all(modules.map((item) => item.then(() => {
      loaded += 1;
      emit(8 + (loaded / modules.length) * 26, "Loading Gamified Experience");
    })));
  } finally {
    stopModules();
  }

  emit(36, "Loading Gamified Experience");
  const [{ TTFLoader }] = await Promise.all([
    import("@pmndrs/uikit"),
  ]);
  const stopAtlas = pulse(96, "Loading Gamified Experience");
  try {
    const loader = new TTFLoader();
    // Do not pass onProgress: MSDF workers cannot clone that callback.
    const atlas = await loader.loadAsync(HUD_FONT_INPUT);
    fonts = wrapFontResult(atlas);
  } finally {
    stopAtlas();
  }

  emit(100, "Gamified ready", true);
}
