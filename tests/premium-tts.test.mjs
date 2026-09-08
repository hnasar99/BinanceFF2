import assert from "node:assert/strict";
import test from "node:test";
import { voiceProfile } from "../lib/agent-voice.mjs";
import {
  buildEdgeSsml,
  engineLabel,
  escapeSsml,
  plannedEngines,
  secMsGecPayload,
  synthesizeSpeech,
  taggedElevenText,
  voiceSecretsFrom,
} from "../lib/premium-tts.mjs";

test("casts every agent to a distinct cinematic voice", () => {
  const casts = Object.values({
    scout: voiceProfile("scout"),
    analyst: voiceProfile("analyst"),
    commander: voiceProfile("commander"),
    strategist: voiceProfile("strategist"),
    executor: voiceProfile("executor"),
    guardian: voiceProfile("guardian"),
  });
  assert.equal(new Set(casts.map((item) => item.elevenLabsVoiceId)).size, 6);
  assert.equal(new Set(casts.map((item) => item.edgeVoice)).size, 6);
  assert.match(voiceProfile("analyst").edgeVoice, /en-GB/);
  assert.match(voiceProfile("guardian").edgeVoice, /en-GB/);
});

test("prefers ElevenLabs then OpenAI before free neural fallbacks", () => {
  assert.deepEqual(plannedEngines(voiceSecretsFrom({})), ["edge", "polly"]);
  assert.deepEqual(
    plannedEngines({ ELEVENLABS_API_KEY: "el", OPENAI_API_KEY: "oa" }),
    ["elevenlabs", "openai", "edge", "polly"],
  );
  assert.equal(engineLabel("edge"), "AZURE NEURAL");
});

test("builds acting tags and SSML without breaking markup", () => {
  const kai = voiceProfile("scout");
  assert.match(taggedElevenText(kai, "USDC moving"), /^\[happily\] U S D C/);
  const ssml = buildEdgeSsml(kai, `Alert <bridge> & "WETH"`);
  assert.match(ssml, /en-US-JennyNeural/);
  assert.match(ssml, /pitch='\+2Hz'/);
  assert.match(ssml, /&lt;bridge&gt;/);
  assert.match(ssml, /&amp;/);
  assert.equal(escapeSsml(`a<"b`), "a&lt;&quot;b");
});

test("GEC payload is a stable 5-minute Windows-filetime window", () => {
  const first = secMsGecPayload(1_778_000_010);
  const later = secMsGecPayload(1_778_000_040);
  assert.equal(first, later);
  assert.match(first, /^[0-9]+6A5AA1D4EAFF4E9FB37E23D68491D6F4$/);
});

test("synthesizeSpeech uses the first engine that returns audio", async () => {
  const audio = new Uint8Array(320).fill(7);
  const result = await synthesizeSpeech({
    agentId: "scout",
    text: "Commander, liquidity is moving.",
    secrets: {},
    edgeSynth: async () => ({ audio, mime: "audio/mpeg", engine: "edge", voice: "en-US-JennyNeural", cast: "Jessica" }),
    fetchImpl: async () => new Response("no", { status: 500 }),
  });
  assert.equal(result.engine, "edge");
  assert.equal(result.audio.byteLength, 320);
});
