import {
  audibleId as audibleIdRaw,
  createVoiceQueue as createVoiceQueueRaw,
  enqueue as enqueueRaw,
  finish as finishRaw,
  holdFloor as holdFloorRaw,
  isWanting as isWantingRaw,
  promote as promoteRaw,
  releaseFloor as releaseFloorRaw,
  wantingIds as wantingIdsRaw,
} from "./voice-queue.mjs";

export type VoiceLine = {
  id: string;
  agentId: string;
  text: string;
};

export type VoiceQueue = {
  seq: number;
  audible: VoiceLine | null;
  items: VoiceLine[];
  held: VoiceLine | null;
};

export function createVoiceQueue(): VoiceQueue {
  return createVoiceQueueRaw() as VoiceQueue;
}
export function enqueue(queue: VoiceQueue, agentId: string, text: string): VoiceQueue {
  return enqueueRaw(queue, agentId, text) as VoiceQueue;
}
export function promote(queue: VoiceQueue, agentId: string): VoiceQueue {
  return promoteRaw(queue, agentId) as VoiceQueue;
}
export function holdFloor(queue: VoiceQueue, agentId: string, text: string): VoiceQueue {
  return holdFloorRaw(queue, agentId, text) as VoiceQueue;
}
export function releaseFloor(queue: VoiceQueue): VoiceQueue {
  return releaseFloorRaw(queue) as VoiceQueue;
}
export function finish(queue: VoiceQueue): VoiceQueue {
  return finishRaw(queue) as VoiceQueue;
}
export function audibleId(queue: VoiceQueue): string | null {
  return audibleIdRaw(queue);
}
export function isWanting(queue: VoiceQueue, agentId: string): boolean {
  return isWantingRaw(queue, agentId);
}
export function wantingIds(queue: VoiceQueue): string[] {
  return wantingIdsRaw(queue) as string[];
}
