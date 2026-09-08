import assert from "node:assert/strict";
import test from "node:test";
import { fitVisemesToDuration, isSpeechMorph, textToVisemes, visemeAt, visemeMorphKeys } from "../lib/kai-lipsync.mjs";

test("maps speech clusters to distinct mouth shapes", () => {
  const track = textToVisemes("Commander, I found an unusual movement.");
  const shapes = new Set(track.map((item) => item.viseme));
  assert.ok(shapes.has("aa"));
  assert.ok(shapes.has("PP"));
  assert.ok(shapes.has("nn"));
  assert.ok(track.at(-1).endMs > 800);
});

test("interpolates openness between visemes and rests after the track", () => {
  const track = textToVisemes("boom");
  const mid = visemeAt(track, track[0].endMs * 0.5);
  assert.ok(mid.openness >= 0);
  const after = visemeAt(track, track.at(-1).endMs + 50);
  assert.equal(after.viseme, "sil");
  assert.equal(after.openness, 0);
});

test("stretches visemes to the real audio duration", () => {
  const track = textToVisemes("go");
  const fitted = fitVisemesToDuration(track, 2400);
  assert.equal(Math.round(fitted.at(-1).endMs), 2400);
});

test("exposes morph aliases for Ready Player Me visemes", () => {
  assert.ok(visemeMorphKeys("aa").includes("mouthopen"));
  assert.ok(visemeMorphKeys("O").includes("mouthfunnel"));
  assert.equal(isSpeechMorph("viseme_aa"), true);
  assert.equal(isSpeechMorph("browInnerUp"), false);
});
