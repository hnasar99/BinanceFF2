import assert from "node:assert/strict";
import test from "node:test";
import { audibleId, createVoiceQueue, enqueue, finish, holdFloor, isWanting, promote, releaseFloor, wantingIds } from "../lib/voice-queue.mjs";

test("first enqueue becomes audible; a second agent waits in FIFO", () => {
  let queue = createVoiceQueue();
  queue = enqueue(queue, "scout", "Radar live.");
  queue = enqueue(queue, "strategist", "Simulation net forty two.");
  assert.equal(audibleId(queue), "scout");
  assert.equal(queue.items.length, 1);
  assert.equal(queue.items[0].agentId, "strategist");
  assert.equal(isWanting(queue, "strategist"), true);
  assert.deepEqual(wantingIds(queue), ["scout", "strategist"]);
});

test("only one audible line exists at a time", () => {
  let queue = createVoiceQueue();
  queue = enqueue(queue, "scout", "One");
  queue = enqueue(queue, "analyst", "Two");
  queue = enqueue(queue, "guardian", "Three");
  assert.equal(queue.audible.agentId, "scout");
  assert.equal(queue.items.length, 2);
  assert.ok(queue.items.every((item) => item.agentId !== queue.audible.agentId));
});

test("latest pending line replaces an older pending line for the same agent", () => {
  let queue = enqueue(createVoiceQueue(), "scout", "First");
  queue = enqueue(queue, "analyst", "Wait");
  queue = enqueue(queue, "analyst", "Updated");
  assert.equal(queue.items.length, 1);
  assert.equal(queue.items[0].text, "Updated");
});

test("promote interrupts the speaker and requeues them at the front", () => {
  let queue = enqueue(createVoiceQueue(), "scout", "Kai first");
  queue = enqueue(queue, "guardian", "Aegis next");
  queue = promote(queue, "guardian");
  assert.equal(audibleId(queue), "guardian");
  assert.equal(queue.items[0].agentId, "scout");
  assert.equal(queue.items[0].text, "Kai first");
});

test("finish drains the next waiting speaker", () => {
  let queue = enqueue(createVoiceQueue(), "scout", "One");
  queue = enqueue(queue, "strategist", "Two");
  queue = finish(queue);
  assert.equal(audibleId(queue), "strategist");
  queue = finish(queue);
  assert.equal(audibleId(queue), null);
  assert.equal(queue.items.length, 0);
});

test("promote is a no-op when that agent has nothing pending", () => {
  const queue = enqueue(createVoiceQueue(), "commander", "Deployed");
  const same = promote(queue, "executor");
  assert.equal(audibleId(same), "commander");
  assert.equal(same.items.length, 0);
});

test("holdFloor parks the current speaker and gives the floor to the hovered agent", () => {
  let queue = enqueue(createVoiceQueue(), "scout", "Kai first");
  queue = enqueue(queue, "guardian", "Aegis waiting");
  queue = holdFloor(queue, "analyst", "Lyra takes the floor");
  assert.equal(audibleId(queue), "analyst");
  assert.equal(queue.held.agentId, "scout");
  assert.equal(queue.held.text, "Kai first");
  assert.equal(isWanting(queue, "scout"), true);
});

test("holdFloor reuses a pending line when the hovered agent already queued one", () => {
  let queue = enqueue(createVoiceQueue(), "scout", "Kai first");
  queue = enqueue(queue, "guardian", "Aegis waiting");
  queue = holdFloor(queue, "guardian", "ignored");
  assert.equal(audibleId(queue), "guardian");
  assert.equal(queue.audible.text, "Aegis waiting");
  assert.equal(queue.items.length, 0);
});

test("releaseFloor restores the parked speaker", () => {
  let queue = enqueue(createVoiceQueue(), "scout", "Kai first");
  queue = holdFloor(queue, "analyst", "Lyra report");
  queue = releaseFloor(queue);
  assert.equal(audibleId(queue), "scout");
  assert.equal(queue.held, null);
  assert.equal(queue.audible.text, "Kai first");
});

test("finish of a held hover restores the parked speaker instead of the FIFO next", () => {
  let queue = enqueue(createVoiceQueue(), "scout", "Kai first");
  queue = enqueue(queue, "strategist", "Nova waits");
  queue = holdFloor(queue, "analyst", "Lyra report");
  queue = finish(queue);
  assert.equal(audibleId(queue), "scout");
  assert.equal(queue.held, null);
  assert.equal(queue.items[0].agentId, "strategist");
});
