"use client";

import { OPS_AGENTS, rosterAgent } from "@/lib/ops-sim";
import { useSpatialI18n } from "../spatial/i18n-context";
import { useOps } from "./ops-context";

function listenerOf(agentId: string, text: string) {
  const mentioned = OPS_AGENTS.find((agent) => {
    if (agent.id === agentId) return false;
    const name = new RegExp(`\\b${agent.name}\\b`, "i");
    const role = new RegExp(`\\b${agent.role}\\b`, "i");
    return name.test(text) || role.test(text);
  });
  if (mentioned) return { id: mentioned.id, name: mentioned.name, kind: "agent" as const };
  if (agentId === "commander" || agentId === "guardian" || agentId === "executor") {
    return { id: "human", name: "you", kind: "human" as const };
  }
  const commander = rosterAgent("commander");
  return { id: commander.id, name: commander.name, kind: "agent" as const };
}

export function StageCaptions() {
  const { speech, audibleId, world } = useOps();
  const { t, line } = useSpatialI18n();
  const spoken = speech?.text && speech.agentId === audibleId ? speech.text : "";
  if (!audibleId || !spoken) return null;

  const speaker = rosterAgent(audibleId);
  const listener = listenerOf(audibleId, spoken);
  const listenerLabel = listener.kind === "human" ? t("Talking to you") : t("Talking to {name}", { name: listener.name });

  return (
    <div className="stage-captions" aria-live="polite" aria-label={t("Subtitles")}>
      <div className="stage-captions-who">
        <b style={{ color: speaker.accent }}>{speaker.name}</b>
        <span aria-hidden="true">→</span>
        <em>{listener.kind === "human" ? t("You") : listener.name}</em>
        <small>{listenerLabel}{world.incoming?.agentId && world.incoming.agentId !== audibleId ? ` · ${t("Next: {name}", { name: rosterAgent(world.incoming.agentId).name })}` : ""}</small>
      </div>
      <p>{line(spoken)}</p>
    </div>
  );
}
