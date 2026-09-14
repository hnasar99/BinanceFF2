// The licensed master is loaded from this stable public slot when present.
// Until the asset is supplied, the Web Audio fallback keeps the choreography musical.
const LICENSED_AURA_TRACK = "/audio/aura/young-black-rich.mp3";

let activeTrack: HTMLAudioElement | null = null;
let fallbackContext: AudioContext | null = null;

function stopActiveTrack() {
  if (!activeTrack) return;
  activeTrack.pause();
  activeTrack.currentTime = 0;
  activeTrack = null;
}

function playFallbackPulse() {
  const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return;
  fallbackContext ??= new AudioCtor();
  const context = fallbackContext;
  void context.resume().catch(() => undefined);
  const master = context.createGain();
  const now = context.currentTime;
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.18, now + 0.08);
  master.gain.setValueAtTime(0.18, now + 7.6);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 8.4);
  master.connect(context.destination);

  const notes = [55, 82.41, 65.41, 98, 55, 110, 73.42, 82.41];
  notes.forEach((frequency, index) => {
    const start = now + index * 0.52;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = index % 3 === 0 ? "sawtooth" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(index % 4 === 0 ? 0.2 : 0.1, start + 0.018);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(start);
    oscillator.stop(start + 0.46);
  });
}

export async function playAuraMusic() {
  stopActiveTrack();
  const audio = new Audio(LICENSED_AURA_TRACK);
  audio.preload = "auto";
  audio.volume = 0.72;
  audio.currentTime = 0;
  activeTrack = audio;
  try {
    await audio.play();
    window.setTimeout(() => {
      if (activeTrack !== audio) return;
      const fade = window.setInterval(() => {
        audio.volume = Math.max(0, audio.volume - 0.08);
        if (audio.volume > 0) return;
        window.clearInterval(fade);
        stopActiveTrack();
      }, 90);
    }, 7800);
  } catch {
    if (activeTrack === audio) activeTrack = null;
    playFallbackPulse();
  }
}
