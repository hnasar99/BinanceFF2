/** Local viseme-rigged doubles. RPM CDN is dead (Jan 2026); files are vendored. */

export type AgentRig = {
  id: string;
  name: string;
  role: string;
  accent: string;
  portrait: string;
  sourceLabel: string;
  sources: string[];
};

/**
 * Best talkable GLBs in 2026, after Ready Player Me shut down:
 * 1. Avatar SDK / MetaPerson — selfie → photoreal GLB + visemes (lookalike path)
 * 2. Avaturn Type-2 — photo creator with blendshapes
 * 3. TalkingHead/MPFB (MakeHuman, CC0) — parametric, viseme-ready
 * 4. Archived RPM GLBs — only if already exported to disk
 * Image-to-3D (Meshy/Tripo) looks like the PNG but usually has no mouth rig.
 */
export const AGENT_RIGS: AgentRig[] = [
  {
    id: "scout",
    name: "KAI",
    role: "SCOUT",
    accent: "#40d7ff",
    portrait: "/agents/kai.png",
    sourceLabel: "Ready Player Me · archived",
    sources: ["/agents/kai.glb"],
  },
  {
    id: "analyst",
    name: "LYRA",
    role: "ANALYST",
    accent: "#a78bfa",
    portrait: "/agents/lyra.png",
    sourceLabel: "Avaturn Type-2",
    sources: ["/agents/lyra.glb"],
  },
  {
    id: "commander",
    name: "ORION",
    role: "COMMANDER",
    accent: "#f3ba2f",
    portrait: "/agents/orion.png",
    sourceLabel: "Avatar SDK MetaPerson",
    sources: ["/agents/orion.glb"],
  },
  {
    id: "strategist",
    name: "NOVA",
    role: "STRATEGIST",
    accent: "#8f7cff",
    portrait: "/agents/nova.png",
    sourceLabel: "MPFB / MakeHuman CC0",
    sources: ["/agents/nova.glb"],
  },
  {
    id: "executor",
    name: "REX",
    role: "EXECUTOR",
    accent: "#ff5151",
    portrait: "/agents/rex.png",
    sourceLabel: "Avatar SDK MetaPerson",
    sources: ["/agents/rex.glb"],
  },
  {
    id: "guardian",
    name: "AEGIS",
    role: "GUARDIAN",
    accent: "#50e3a4",
    portrait: "/agents/aegis.png",
    sourceLabel: "Avatar SDK MetaPerson",
    sources: ["/agents/aegis.glb"],
  },
];

export function agentRig(id: string) {
  return AGENT_RIGS.find((item) => item.id === id) ?? AGENT_RIGS[0];
}
