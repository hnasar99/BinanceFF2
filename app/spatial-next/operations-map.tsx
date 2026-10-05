"use client";
import { useState } from "react";
import { agentIds } from "@/lib/agent-runtime";
import { rosterAgent } from "@/lib/ops-sim";
import { useOps } from "./ops-context";
import { useAgentRuntime } from "./runtime-context";
import { useSpatialI18n } from "../spatial/i18n-context";
import "./operations-map.css";

export function OperationsMap() {
  const runtime = useAgentRuntime(), ops = useOps();
  const { locale } = useSpatialI18n();
  const copy = (en: string, es: string, pt: string) => locale === "es" ? es : locale === "pt" ? pt : en;
  const [title, setTitle] = useState("BNB liquidity research");
  const [brief, setBrief] = useState("Plan a BNB liquidity research mission. Identify the data and simulations required, challenge the assumptions, and explain what remains unverified. Do not invent prices or execute transactions.");
  const snapshot = runtime.snapshot;
  const agent = snapshot?.agents.find(a => a.id === ops.world.selectedId);
  const edges = snapshot?.events.filter(e => e.to) || [];
  return <section className="operations-surface" aria-label="Agent operations">
    <header className="operations-toolbar">
      <strong>{copy("Agent operations", "Operaciones de agentes", "Operações de agentes")}</strong>
      <span className={runtime.connected ? "runtime-online" : ""}>{runtime.mode === "demo" ? "DEMO" : runtime.checking ? "CONNECTING" : runtime.connected ? "OPENHUMAN CONNECTED" : "OPENHUMAN OFFLINE"}</span>
      <nav aria-label="View">
        {(["world", "mission", "agent"] as const).map(view => <button key={view} aria-pressed={runtime.view === view} onClick={() => runtime.setView(view)}>{view === "world" ? copy("World", "Mundo", "Mundo") : view === "mission" ? copy("Mission map", "Mapa de misión", "Mapa de missão") : copy("Agent", "Agente", "Agente")}</button>)}
      </nav>
      <button onClick={() => runtime.setMode(runtime.mode === "demo" ? "runtime" : "demo")}>{runtime.mode === "demo" ? copy("Return to runtime", "Volver al runtime", "Voltar ao runtime") : copy("Try demo", "Probar demo", "Testar demo")}</button>
    </header>
    {runtime.mode === "runtime" && runtime.view !== "world" && <div className="operations-body">
      {!runtime.connected && <p className="runtime-notice">{copy("The harness is offline. Characters wait for real events. Start the OpenHuman bridge and connect it to activate the squad.", "El harness está offline. Los personajes esperan eventos reales. Hay que iniciar y conectar el puente de OpenHuman para activar el equipo.", "O harness está offline. Os personagens aguardam eventos reais. Inicie e conecte a ponte OpenHuman para ativar a equipe.")}</p>}
      {runtime.error && <p role="alert" className="runtime-notice runtime-error">{runtime.error}</p>}
      <div className="operations-layout">
        <div>
          {runtime.view === "mission" && <div className="operations-nodes">
            {agentIds.map((id, index) => {
              const roster = rosterAgent(id), state = snapshot?.agents.find(a => a.id === id);
              return <button key={id} className={`operation-node ${ops.world.selectedId === id ? "selected" : ""}`} style={{ borderColor: roster.accent }} onClick={() => ops.select(id, { takeFloor: false })} aria-pressed={ops.world.selectedId === id}>
                <small>{index + 1} · {roster.role}</small><strong>{roster.name}</strong><span>{state?.status || "OFFLINE"}</span><small>{state?.instanceId || copy("No instance", "Sin instancia", "Sem instância")}</small>
              </button>;
            })}
          </div>}
          <article className="operations-inspector">
            <h2>{rosterAgent(ops.world.selectedId).name}</h2>
            <p>{agent?.objective || copy("Select an agent to inspect its task and response.", "Seleccioná un agente para ver su tarea y respuesta.", "Selecione um agente para ver sua tarefa e resposta.")}</p>
            <dl><dt>Instance</dt><dd>{agent?.instanceId || "—"}</dd><dt>Session</dt><dd>{agent?.sessionId || "—"}</dd><dt>Capabilities</dt><dd>{copy("Analysis only · no tools · no wallet", "Solo análisis · sin tools · sin wallet", "Só análise · sem ferramentas · sem wallet")}</dd></dl>
            <h3>{copy("Agent response", "Respuesta del agente", "Resposta do agente")}</h3>
            <div className="agent-response">{agent?.reply || copy("No response yet.", "Todavía no hay respuesta.", "Ainda não há resposta.")}</div>
          </article>
          {edges.length > 0 && <div className="operations-handoffs"><h3>{copy("Handoffs", "Intercambios", "Trocas")}</h3>{edges.map(e => <p key={e.id}><b>{rosterAgent(e.agentId).name} → {rosterAgent(e.to!).name}</b><span>{e.text}</span></p>)}</div>}
        </div>
        <aside className="operations-brief">
          <h2>{copy("Start a real mission", "Iniciar misión real", "Iniciar missão real")}</h2>
          <label>{copy("Title", "Título", "Título")}<input value={title} maxLength={160} onChange={e => setTitle(e.target.value)} /></label>
          <label>Brief<textarea value={brief} maxLength={8000} onChange={e => setBrief(e.target.value)} /></label>
          <button disabled={!runtime.connected || runtime.busy || snapshot?.status === "RUNNING" || !title.trim() || !brief.trim()} onClick={() => void runtime.start(title, brief)}>{runtime.busy || snapshot?.status === "RUNNING" ? copy("Agents working…", "Agentes trabajando…", "Agentes trabalhando…") : copy("Start squad", "Iniciar equipo", "Iniciar equipe")}</button>
          <p>{copy("Sign in to start. Each avatar maps to an OpenHuman instance. Replies are model analysis; prices, simulations and profit require separate verified tools. No funds move.", "Iniciá sesión para comenzar. Cada avatar corresponde a una instancia de OpenHuman. Las respuestas son análisis del modelo; precios, simulaciones y ganancias requieren tools verificadas. No se mueven fondos.", "Entre para começar. Cada avatar corresponde a uma instância OpenHuman. As respostas são análises do modelo; preços, simulações e lucros exigem ferramentas verificadas. Nenhum fundo é movimentado.")}</p>
          {snapshot && <><h3>{snapshot.title}</h3><p>{snapshot.status} · {snapshot.agents.filter(a => a.status === "COMPLETED").length}/6</p><ol className="operations-journal">{snapshot.events.slice().reverse().map(e => <li key={e.id}><b>{rosterAgent(e.agentId).name} · {e.kind}</b><span>{e.text}</span></li>)}</ol></>}
        </aside>
      </div>
    </div>}
  </section>;
}
