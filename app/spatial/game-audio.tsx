"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type GameAudio = {
  started: boolean;
  muted: boolean;
  hover: () => void;
  click: () => void;
  deploy: () => void;
  toggle: () => void;
};

const GameAudioContext = createContext<GameAudio | null>(null);

export function GameAudioProvider({ children }: { children: ReactNode }) {
  const context = useRef<AudioContext | null>(null);
  const master = useRef<GainNode | null>(null);
  const music = useRef<GainNode | null>(null);
  const effects = useRef<GainNode | null>(null);
  const timer = useRef<number | null>(null);
  const step = useRef(0);
  const startedRef = useRef(false);
  const mutedRef = useRef(false);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);

  const tone = useCallback((frequency: number, duration: number, volume: number, type: OscillatorType, bus: GainNode, delay = 0) => {
    const audio = context.current;
    if (!audio || audio.state === "closed") return;
    const now = audio.currentTime + delay;
    const oscillator = audio.createOscillator();
    const envelope = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope);
    envelope.connect(bus);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.025);
  }, []);

  const start = useCallback(() => {
    if (!context.current) {
      const audio = new window.AudioContext();
      const masterGain = audio.createGain();
      const musicGain = audio.createGain();
      const effectsGain = audio.createGain();
      masterGain.gain.value = 0.9;
      musicGain.gain.value = 0.28;
      effectsGain.gain.value = 0.45;
      musicGain.connect(masterGain);
      effectsGain.connect(masterGain);
      masterGain.connect(audio.destination);
      context.current = audio;
      master.current = masterGain;
      music.current = musicGain;
      effects.current = effectsGain;
    }

    void context.current.resume();
    if (startedRef.current) return;
    startedRef.current = true;
    setStarted(true);
    const bass = [55, 55, 82.41, 55, 65.41, 55, 73.42, 82.41];
    const arpeggio = [220, 277.18, 329.63, 415.3, 329.63, 277.18, 246.94, 329.63];
    const sequence = () => {
      if (mutedRef.current || !music.current) return;
      const beat = step.current % bass.length;
      tone(bass[beat], 0.24, beat % 4 === 0 ? 0.09 : 0.055, "triangle", music.current);
      if (beat % 2 === 0) tone(arpeggio[beat], 0.12, 0.018, "sine", music.current, 0.035);
      if (beat === 3 || beat === 7) tone(880, 0.035, 0.008, "square", music.current, 0.09);
      step.current += 1;
    };
    sequence();
    timer.current = window.setInterval(sequence, 310);
  }, [tone]);

  const hover = useCallback(() => {
    if (!startedRef.current || mutedRef.current || !effects.current) return;
    tone(680, 0.035, 0.025, "sine", effects.current);
  }, [tone]);

  const click = useCallback(() => {
    start();
    if (!effects.current || mutedRef.current) return;
    tone(250, 0.055, 0.055, "triangle", effects.current);
    tone(510, 0.075, 0.025, "sine", effects.current, 0.025);
  }, [start, tone]);

  const deploy = useCallback(() => {
    start();
    if (!effects.current || mutedRef.current) return;
    [110, 164.81, 220, 329.63].forEach((frequency, index) => {
      tone(frequency, 0.34, 0.075 - index * 0.01, index < 2 ? "sawtooth" : "sine", effects.current!, index * 0.075);
    });
  }, [start, tone]);

  const toggle = useCallback(() => {
    if (!startedRef.current) {
      start();
      return;
    }
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    const audio = context.current;
    const gain = master.current;
    if (audio && gain) gain.gain.setTargetAtTime(next ? 0.0001 : 0.9, audio.currentTime, 0.045);
  }, [start]);

  useEffect(() => () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    if (context.current && context.current.state !== "closed") void context.current.close();
  }, []);

  const value = useMemo(() => ({ started, muted, hover, click, deploy, toggle }), [started, muted, hover, click, deploy, toggle]);
  return <GameAudioContext.Provider value={value}>{children}</GameAudioContext.Provider>;
}

export function useGameAudio(): GameAudio {
  const audio = useContext(GameAudioContext);
  if (!audio) throw new Error("useGameAudio must be used inside GameAudioProvider");
  return audio;
}
