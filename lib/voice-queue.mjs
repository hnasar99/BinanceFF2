function clone(queue) {
  return {
    seq: queue.seq,
    audible: queue.audible ? { ...queue.audible } : null,
    items: queue.items.map((item) => ({ ...item })),
    held: queue.held ? { ...queue.held } : null,
  };
}

export function createVoiceQueue() {
  return { seq: 0, audible: null, items: [], held: null };
}

function makeItem(queue, agentId, text) {
  queue.seq += 1;
  return { id: `V-${queue.seq}`, agentId: String(agentId), text: String(text || "").trim() };
}

function takeNext(queue) {
  if (queue.audible || !queue.items.length) return queue;
  queue.audible = queue.items[0];
  queue.items = queue.items.slice(1);
  return queue;
}

export function enqueue(queue, agentId, text) {
  const next = clone(queue);
  const line = String(text || "").trim();
  if (!agentId || !line) return next;
  if (next.audible?.agentId === agentId && next.audible.text === line) return next;
  next.items = next.items.filter((item) => item.agentId !== agentId);
  const item = makeItem(next, agentId, line);
  if (!next.audible) {
    next.audible = item;
    return next;
  }
  next.items = [...next.items, item];
  return next;
}

export function promote(queue, agentId) {
  const next = clone(queue);
  if (!agentId) return next;
  if (next.audible?.agentId === agentId) return next;
  const pending = next.items.find((item) => item.agentId === agentId);
  if (!pending) return next;
  next.items = next.items.filter((item) => item.agentId !== agentId);
  if (next.audible) next.items = [next.audible, ...next.items];
  next.audible = pending;
  return next;
}

export function holdFloor(queue, agentId, text) {
  const next = clone(queue);
  if (!agentId) return next;
  if (next.audible?.agentId === agentId) return next;
  if (next.audible && !next.held) next.held = { ...next.audible };
  const pending = next.items.find((item) => item.agentId === agentId);
  next.items = next.items.filter((item) => item.agentId !== agentId);
  const line = pending?.text || String(text || "").trim();
  if (!line) return next;
  next.audible = pending ?? makeItem(next, agentId, line);
  return next;
}

export function releaseFloor(queue) {
  const next = clone(queue);
  next.audible = next.held;
  next.held = null;
  return next;
}

export function finish(queue) {
  const next = clone(queue);
  next.audible = null;
  if (next.held) {
    next.audible = next.held;
    next.held = null;
    return next;
  }
  return takeNext(next);
}

export function audibleId(queue) {
  return queue.audible?.agentId ?? null;
}

export function isWanting(queue, agentId) {
  if (!agentId) return false;
  if (queue.audible?.agentId === agentId) return true;
  if (queue.held?.agentId === agentId) return true;
  return queue.items.some((item) => item.agentId === agentId);
}

export function wantingIds(queue) {
  const ids = queue.items.map((item) => item.agentId);
  if (queue.held) ids.unshift(queue.held.agentId);
  if (queue.audible) ids.unshift(queue.audible.agentId);
  return [...new Set(ids)];
}
