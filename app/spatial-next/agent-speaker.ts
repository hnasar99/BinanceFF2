"use client";

import { cannedVoiceSrc, engineLabel, pickVoice, speakableText, voiceProfile } from "@/lib/agent-voice";

export type VoicePlayMeta = {
  engine: string;
  label: string;
  voice: string;
  durationMs: number;
};

let current: { audio: HTMLAudioElement; url: string } | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;

export function stopAgentSpeech() {
  if (current) {
    current.audio.pause();
    current.audio.src = "";
    URL.revokeObjectURL(current.url);
    current = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

function listVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

function speakBrowser(agentId: string, text: string): Promise<VoicePlayMeta> {
  const profile = voiceProfile(agentId);
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve({ engine: "browser", label: "BROWSER TTS", voice: "none", durationMs: 1800 });
      return;
    }
    const start = () => {
      const voice = pickVoice(listVoices(), profile);
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

async function playUrl(
  src: string,
  engine: string,
  voice: string,
  revoke = false,
): Promise<VoicePlayMeta> {
  const audio = new Audio(src);
  current = { audio, url: revoke ? src : "" };
  const meta = await new Promise<VoicePlayMeta>((resolve, reject) => {
    audio.onloadedmetadata = () => {
      const durationMs = Number.isFinite(audio.duration) ? audio.duration * 1000 : 2200;
      resolve({ engine, label: engineLabel(engine), voice, durationMs });
    };
    audio.onerror = () => reject(new Error("audio_decode_failed"));
  });
  await audio.play();
  return meta;
}

export async function playAgentSpeech(
  agentId: string,
  text: string,
  onMeta?: (meta: VoicePlayMeta) => void,
): Promise<VoicePlayMeta> {
  stopAgentSpeech();
  const profile = voiceProfile(agentId);
  const canned = cannedVoiceSrc(agentId, text);
  try {
    if (canned) {
      const meta = await playUrl(canned, "edge", profile.edgeVoice);
      onMeta?.(meta);
      return meta;
    }
    const response = await fetch("/api/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, text }),
    });
    if (!response.ok) throw new Error(`voice_${response.status}`);
    const blob = await response.blob();
    if (blob.size < 200) throw new Error("voice_empty");
    const url = URL.createObjectURL(blob);
    const meta = await playUrl(
      url,
      response.headers.get("x-voice-engine") || "neural",
      response.headers.get("x-voice-name") || profile.cast,
      true,
    );
    onMeta?.(meta);
    return meta;
  } catch {
    const fallback = await speakBrowser(agentId, text);
    onMeta?.(fallback);
    return fallback;
  }
}
