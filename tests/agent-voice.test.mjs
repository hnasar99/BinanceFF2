import assert from "node:assert/strict";
import test from "node:test";
import { AGENT_LINES, DEPLOY_LINE, cannedVoiceSrc, pickVoice, shouldUpgradeVoice, speakableText, voiceCacheKey, voiceProfile } from "../lib/agent-voice.mjs";

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
  for (const [id, line] of Object.entries(AGENT_LINES)) {
    assert.equal(cannedVoiceSrc(id, line), `/agents/voice/${id}.mp3`);
  }
  assert.equal(cannedVoiceSrc("commander", DEPLOY_LINE), "/agents/voice/deploy.mp3");
  assert.equal(cannedVoiceSrc("guardian", "wrong line"), null);
});

test("upgrades a weaker recording when a better engine is available", () => {
  assert.equal(shouldUpgradeVoice("edge", "elevenlabs"), true);
  assert.equal(shouldUpgradeVoice("edge", "edge"), false);
  assert.equal(shouldUpgradeVoice("elevenlabs", "openai"), false);
  assert.equal(shouldUpgradeVoice("browser", "edge"), true);
  assert.equal(shouldUpgradeVoice(null, "edge"), true);
});

test("cache keys stay stable for the same agent line", () => {
  assert.equal(voiceCacheKey("scout", "  Hello  "), voiceCacheKey("scout", "Hello"));
  assert.notEqual(voiceCacheKey("scout", "Hello"), voiceCacheKey("analyst", "Hello"));
  assert.notEqual(voiceCacheKey("scout", "Hello", "en"), voiceCacheKey("scout", "Hello", "es"));
});

test("Spanish and Portuguese profiles pick matching locale voices", () => {
  const kaiEs = pickVoice(voices, voiceProfile("scout", "es"));
  const orionPt = pickVoice([
    ...voices,
    { name: "Microsoft Antonio", lang: "pt-BR", localService: true },
    { name: "Microsoft Francisca", lang: "pt-BR", localService: true },
  ], voiceProfile("commander", "pt"));
  assert.match(kaiEs.lang, /^es-/i);
  assert.match(orionPt.lang, /^pt-/i);
  assert.equal(voiceProfile("scout", "es").edgeVoice, "es-MX-DaliaNeural");
  assert.equal(voiceProfile("guardian", "pt").edgeVoice, "pt-BR-NicolauNeural");
  assert.equal(cannedVoiceSrc("scout", AGENT_LINES.scout, "es"), null);
  assert.equal(cannedVoiceSrc("scout", AGENT_LINES.scout, "en"), "/agents/voice/scout.mp3");
});

test("expands market tickers so English TTS does not invent Spanish phonemes", () => {
  assert.match(speakableText("Exit through Uniswap, USDC to WETH"), /U S D C/);
  assert.match(speakableText("Exit through Uniswap, USDC to WETH"), /W eth/);
});
