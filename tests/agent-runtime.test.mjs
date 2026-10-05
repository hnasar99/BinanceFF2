import test from 'node:test';
import assert from 'node:assert/strict';
import { runtimeSnapshot, runtimeRequest, agentIds } from '../lib/agent-runtime.ts';
import { projectRuntime } from '../lib/runtime-world.ts';
import { createOpsWorld, deployMission } from '../lib/ops-sim.mjs';
const fixture = () => ({
  missionId: 'bfa2fe63-b731-48a4-b72a-b85fc44cdccb', title: 'Research', brief: 'Find evidence gaps', startedAt: 1000, status: 'RUNNING', execute: false,
  agents: agentIds.map(id => ({ id, instanceId: `g1_${id}`, status: id === 'commander' ? 'COMPLETED' : id === 'scout' ? 'THINKING' : 'WAITING', objective: `${id} objective`, reply: id === 'commander' ? 'Need timestamped quotes.' : '', sessionId: id === 'commander' ? 'session-1' : null })),
  events: [{ id: 'e1', at: 1100, agentId: 'commander', to: 'scout', kind: 'message', text: 'Need timestamped quotes.' }],
});
test('runtime rejects economic execution, duplicate agents and malformed mission IDs', () => {
  assert.ok(runtimeSnapshot.safeParse(fixture()).success);
  assert.equal(runtimeSnapshot.safeParse({ ...fixture(), execute: true }).success, false);
  assert.equal(runtimeSnapshot.safeParse({ ...fixture(), missionId: '../other-user' }).success, false);
  const duplicate = fixture(); duplicate.agents[5] = duplicate.agents[0];
  assert.equal(runtimeSnapshot.safeParse(duplicate).success, false);
});
test('snapshot drives avatars without changing selected agent or inventing evidence', () => {
  const world = createOpsWorld(1000); world.selectedId = 'guardian';
  const projected = projectRuntime(world, fixture());
  assert.equal(projected.selectedId, 'guardian');
  assert.equal(projected.agents.scout.status, 'WORKING');
  assert.equal(projected.agents.commander.task, 'Need timestamped quotes.');
  assert.equal(projected.compliance.completionPct, 17);
  assert.equal(projected.compliance.evidence, 0);
  assert.equal(projected.compliance.mandate, 'NONE');
  assert.equal(projected.gate, null);
  assert.equal(projected.events[0].id, 'e1');
});
test('offline runtime clears demo events, progress, authority and fabricated tasks', () => {
  const world = deployMission(createOpsWorld(1000), 'Demo', 1000);
  world.compliance.completionPct = 75; world.compliance.evidence = 6;
  const offline = projectRuntime(world, null);
  assert.equal(offline.mission, null);
  assert.equal(offline.running, false);
  assert.deepEqual(offline.events, []);
  assert.equal(offline.compliance.completionPct, 0);
  assert.equal(offline.compliance.evidence, 0);
  assert.ok(Object.values(offline.agents).every(a => a.status === 'STANDBY' && a.checks.length === 0));
});
test('mission inputs reject empty brief, oversized prompts and unsupported locales', () => {
  assert.ok(runtimeRequest.safeParse({title:'Check', brief:'Evidence', locale:'es'}).success);
  for (const input of [{ title:'x', brief:' ', locale:'en' }, {title:'x',brief:'x'.repeat(8001),locale:'en'}, {title:'x',brief:'y',locale:'xx'}]) assert.equal(runtimeRequest.safeParse(input).success,false);
});
