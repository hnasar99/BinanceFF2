import assert from "node:assert/strict";
import test from "node:test";
import { cannedVoiceSrc, pickVoice, speakableText, voiceProfile } from "../lib/agent-voice.mjs";

const voices = [
  { name: "Microsoft Pablo", lang: "es-ES", localService: true },
  { name: "Google español", lang: "es-US", localService: false },
  { name: "Microsoft Zira - English (United States)", lang: "en-US", localService: true },
  { name: "Microsoft David - English (United States)", lang: "en-US", localService: true },
  { name: "Google UK English Female", lang: "en-GB", localService: false },
  { name: "Microsoft Arthur Online (Natural)", lang: "en-GB", localService: false },
];

test("KAI and LYRA pick English female voices, not Spanish", () => {
  const kai = pickVoice(voices, voiceProfile("scout"));
  const lyra = pickVoice(voices, voiceProfile("analyst"));
  assert.match(kai.name, /Zira|Female/i);
  assert.match(lyra.name, /Female/i);
  assert.ok(!/es-/i.test(kai.lang));
  assert.ok(!/es-/i.test(lyra.lang));
});

test("ORION and REX pick English male voices", () => {
  const orion = pickVoice(voices, voiceProfile("commander"));
  const rex = pickVoice(voices, voiceProfile("executor"));
  assert.match(orion.name, /David|Arthur|Male/i);
  assert.match(rex.name, /David|Guy|Male/i);
});

test("maps each agent line to a baked neural take", () => {
  assert.equal(cannedVoiceSrc("scout", "Commander, I found an unusual liquidity movement on Arbitrum."), "/agents/voice/scout.mp3");
  assert.equal(cannedVoiceSrc("guardian", "wrong line"), null);
});

test("expands market tickers so English TTS does not invent Spanish phonemes", () => {
  assert.match(speakableText("Exit through Uniswap, USDC to WETH"), /U S D C/);
  assert.match(speakableText("Exit through Uniswap, USDC to WETH"), /W eth/);
});
