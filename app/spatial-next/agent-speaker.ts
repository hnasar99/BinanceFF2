"use client";

import { cannedVoiceSrc, engineLabel, pickVoice, shouldUpgradeVoice, speakableText, voiceCacheKey, voiceProfile } from "@/lib/agent-voice";

export type VoicePlayMeta = {
  engine: string;
  label: string;
  voice: string;
  durationMs: number;
};

const VOICE_CACHE_NAME = "binanceff-agent-voice-v1";
const memoryCache = new Map<string, { blob: Blob; engine: string; voice: string }>();

let current: { audio: HTMLAudioElement; url: string } | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let parked: { audio: HTMLAudioElement; url: string } | null = null;
let parkedUtterance: SpeechSynthesisUtterance | null = null;
let playToken = 0;

function dropClip(clip: { audio: HTMLAudioElement; url: string } | null) {
  if (!clip) return;
  clip.audio.pause();
  clip.audio.onended = null;
  clip.audio.onerror = null;
  clip.audio.src = "";
  if (clip.url) URL.revokeObjectURL(clip.url);
}

function haltAudio() {
  dropClip(current);
  current = null;
  if (typeof window !== "undefined" && window.speechSynthesis && !parkedUtterance) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

function haltParked() {
  dropClip(parked);
  parked = null;
  parkedUtterance = null;
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function stopAgentSpeech() {
  playToken += 1;
  haltAudio();
  haltParked();
}

export function stopHoverSpeech() {
  playToken += 1;
  haltAudio();
}

export function pauseAgentSpeech() {
  if (parked) haltParked();
  if (current) {
    current.audio.pause();
    parked = current;
    current = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis && currentUtterance) {
    window.speechSynthesis.pause();
    parkedUtterance = currentUtterance;
    currentUtterance = null;
  }
}

export function resumeAgentSpeech(): Promise<boolean> {
  return new Promise((resolve) => {
    haltAudio();
    if (parked) {
      current = parked;
      parked = null;
      const audio = current.audio;
      audio.onended = () => resolve(true);
      audio.onerror = () => resolve(false);
      void audio.play().catch(() => resolve(false));
      return;
    }
    if (parkedUtterance && typeof window !== "undefined" && window.speechSynthesis) {
      currentUtterance = parkedUtterance;
      parkedUtterance = null;
      const utterance = currentUtterance;
      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);
      window.speechSynthesis.resume();
      return;
    }
    resolve(false);
  });
}

function cacheRequest(key: string) {
  return new Request(`https://binanceff.voice/local/${encodeURIComponent(key)}`);
}

async function readVoiceCache(key: string) {
  const hit = memoryCache.get(key);
  if (hit) return hit;
  if (typeof caches === "undefined") return null;
  try {
    const cache = await caches.open(VOICE_CACHE_NAME);
    const response = await cache.match(cacheRequest(key));
    if (!response) return null;
    const blob = await response.blob();
    if (blob.size < 200) return null;
    const entry = {
      blob,
      engine: response.headers.get("x-voice-engine") || "edge",
      voice: response.headers.get("x-voice-name") || "neural",
    };
    memoryCache.set(key, entry);
    return entry;
  } catch {
    return null;
  }
}

async function writeVoiceCache(key: string, blob: Blob, engine: string, voice: string) {
  const entry = { blob, engine, voice };
  memoryCache.set(key, entry);
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open(VOICE_CACHE_NAME);
    await cache.put(
      cacheRequest(key),
      new Response(blob, {
        headers: {
          "Content-Type": blob.type || "audio/mpeg",
          "X-Voice-Engine": engine,
          "X-Voice-Name": voice,
        },
      }),
    );
  } catch {
    /* private mode / workers without Cache Storage */
  }
}

function listVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

function speakBrowser(agentId: string, text: string, locale = "en"): Promise<VoicePlayMeta> {
  const profile = voiceProfile(agentId, locale);
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve({ engine: "browser", label: "BROWSER TTS", voice: "none", durationMs: 1800 });
      return;
    }
    const start = () => {
      const voice = pickVoice(listVoices(), profile);
      parkedUtterance = null;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(speakableText(text));
      utterance.lang = profile.lang;
      utterance.rate = profile.rate;
      utterance.pitch = profile.pitch;
      if (voice) utterance.voice = voice;
      currentUtterance = utterance;
      const estimated = Math.max(1400, speakableText(text).length * (86 / Math.max(0.6, profile.rate)));
      utterance.onend = () => resolve({
        engine: "browser",
        label: "BROWSER TTS",
        voice: voice?.name || "system",
        durationMs: estimated,
      });
      utterance.onerror = () => resolve({
        engine: "browser",
        label: "BROWSER TTS",
        voice: voice?.name || "system",
        durationMs: estimated,
      });
      window.speechSynthesis.speak(utterance);
    };
    if (listVoices().length) {
      start();
      return;
    }
    window.speechSynthesis.addEventListener("voiceschanged", start, { once: true });
    window.setTimeout(start, 400);
  });
}

const CANCELLED: VoicePlayMeta = { engine: "cancelled", label: "CANCELLED", voice: "none", durationMs: 0 };

async function playUrl(
  src: string,
  engine: string,
  voice: string,
  token: number,
  revoke = false,
  onMeta?: (meta: VoicePlayMeta) => void,
): Promise<VoicePlayMeta> {
  if (token !== playToken) return CANCELLED;
  haltAudio();
  const audio = new Audio(src);
  current = { audio, url: revoke ? src : "" };
  const meta = await new Promise<VoicePlayMeta>((resolve, reject) => {
    audio.onloadedmetadata = () => {
      const durationMs = Number.isFinite(audio.duration) ? audio.duration * 1000 : 2200;
      resolve({ engine, label: engineLabel(engine), voice, durationMs });
    };
    audio.onerror = () => reject(new Error("audio_decode_failed"));
  });
  if (token !== playToken) {
    haltAudio();
    return CANCELLED;
  }
  onMeta?.(meta);
  await audio.play();
  await new Promise<void>((resolve) => {
    if (token !== playToken) {
      resolve();
      return;
    }
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
  });
  return token === playToken ? meta : CANCELLED;
}

async function playBlob(blob: Blob, engine: string, voice: string, token: number, onMeta?: (meta: VoicePlayMeta) => void) {
  return playUrl(URL.createObjectURL(blob), engine, voice, token, true, onMeta);
}

let bestEngineAt = 0;
let bestEngine = "edge";

async function probeBestEngine() {
  if (Date.now() - bestEngineAt < 15000 && bestEngine) return bestEngine;
  try {
    const response = await fetch("/api/voice");
    if (!response.ok) return bestEngine;
    const body = (await response.json()) as { bestEngine?: string };
    if (body.bestEngine) {
      bestEngine = body.bestEngine;
      bestEngineAt = Date.now();
    }
  } catch {
    /* keep last known best */
  }
  return bestEngine;
}

async function loadCannedTake(agentId: string, text: string, locale = "en") {
  const canned = cannedVoiceSrc(agentId, text, locale);
  if (!canned) return null;
  const response = await fetch(canned);
  if (!response.ok) return null;
  const blob = await response.blob();
  if (blob.size < 200) return null;
  const voice = voiceProfile(agentId, locale).edgeVoice;
  return { blob, engine: "edge", voice };
}

async function fetchBestTake(agentId: string, text: string, locale = "en") {
  const profile = voiceProfile(agentId, locale);
  const response = await fetch("/api/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, text, locale }),
  });
  if (!response.ok) throw new Error(`voice_${response.status}`);
  const blob = await response.blob();
  if (blob.size < 200) throw new Error("voice_empty");
  return {
    blob,
    engine: response.headers.get("x-voice-engine") || "neural",
    voice: response.headers.get("x-voice-name") || profile.cast,
  };
}

export async function playAgentSpeech(
  agentId: string,
  text: string,
  onMeta?: (meta: VoicePlayMeta) => void,
  locale = "en",
): Promise<VoicePlayMeta> {
  const token = ++playToken;
  haltAudio();
  const key = voiceCacheKey(agentId, text, locale);
  const cached = await readVoiceCache(key);
  if (token !== playToken) return CANCELLED;
  const recorded = cached ?? await loadCannedTake(agentId, text, locale);
  if (token !== playToken) return CANCELLED;
  if (recorded && !cached) await writeVoiceCache(key, recorded.blob, recorded.engine, recorded.voice);

  const emit = (meta: VoicePlayMeta) => {
    if (token !== playToken || meta.engine === "cancelled") return meta;
    onMeta?.(meta);
    return meta;
  };

  try {
    const best = await probeBestEngine();
    if (token !== playToken) return CANCELLED;
    if (!recorded || shouldUpgradeVoice(recorded.engine, best)) {
      const upgraded = await fetchBestTake(agentId, text, locale);
      if (token !== playToken) return CANCELLED;
      if (!recorded || shouldUpgradeVoice(recorded.engine, upgraded.engine)) {
        await writeVoiceCache(key, upgraded.blob, upgraded.engine, upgraded.voice);
        return await playBlob(upgraded.blob, upgraded.engine, upgraded.voice, token, onMeta);
      }
    }
    if (recorded) return await playBlob(recorded.blob, recorded.engine, recorded.voice, token, onMeta);
    throw new Error("no_take");
  } catch {
    if (token !== playToken) return CANCELLED;
    if (recorded) return await playBlob(recorded.blob, recorded.engine, recorded.voice, token, onMeta);
    const fallback = await speakBrowser(agentId, text, locale);
    return emit(fallback);
  }
}
