import { z } from "zod";

export const agentIds = ["commander", "scout", "strategist", "guardian", "analyst", "executor"] as const;
export const runtimeAgent = z.object({
  id: z.enum(agentIds), instanceId: z.string().max(100),
  status: z.enum(["WAITING", "THINKING", "COMPLETED", "BLOCKED", "ERROR"]),
  objective: z.string().max(4000), reply: z.string().max(24000),
  sessionId: z.string().max(200).nullable(),
});
export const runtimeSnapshot = z.object({
  missionId: z.string().uuid(), title: z.string().max(160), brief: z.string().max(8000),
  startedAt: z.number(), status: z.enum(["RUNNING", "COMPLETED", "ERROR"]),
  agents: z.array(runtimeAgent).length(6).refine(a => new Set(a.map(x => x.id)).size === 6),
  events: z.array(z.object({
    id: z.string().max(100), at: z.number(), agentId: z.enum(agentIds),
    to: z.enum(agentIds).nullable(), kind: z.enum(["started", "message", "completed", "error"]),
    text: z.string().max(24000),
  })).max(100),
  execute: z.literal(false),
});
export type RuntimeSnapshot = z.infer<typeof runtimeSnapshot>;
export const runtimeRequest = z.object({
  title: z.string().trim().min(1).max(160), brief: z.string().trim().min(1).max(8000),
  locale: z.enum(["en", "es", "pt"]),
});
