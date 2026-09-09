import { cannedVoiceSrc, shouldUpgradeVoice, voiceCacheKey, voiceProfile } from "@/lib/agent-voice";
import { engineLabel, plannedEngines, synthesizeSpeech, voiceSecretsFrom } from "@/lib/premium-tts";

const MAX_CHARS = 420;

async function readSecrets() {
  const bag: Record<string, string> = {};
  try {
    const { env } = await import("cloudflare:workers");
    const bindings = env as Record<string, string>;
    if (bindings.ELEVENLABS_API_KEY) bag.ELEVENLABS_API_KEY = bindings.ELEVENLABS_API_KEY;
    if (bindings.OPENAI_API_KEY) bag.OPENAI_API_KEY = bindings.OPENAI_API_KEY;
  } catch {
    /* local tests / missing binding */
  }
  if (typeof process !== "undefined") {
    if (process.env.ELEVENLABS_API_KEY) bag.ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    if (process.env.OPENAI_API_KEY) bag.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  }
  return voiceSecretsFrom(bag);
}

function parseLocale(value?: string) {
  return value === "es" || value === "pt" ? value : "en";
}

function parseRequest(source: { agentId?: string; text?: string; locale?: string }) {
  const agentId = String(source.agentId || "scout");
  const text = String(source.text || "").trim().slice(0, MAX_CHARS);
  const locale = parseLocale(source.locale);
  if (!text) return null;
  voiceProfile(agentId, locale);
  return { agentId, text, locale };
}

function audioResponse(
  result: { audio: Uint8Array; mime: string; engine: string; voice?: string; cast?: string },
  cache: "canned" | "hit" | "miss" | "upgrade",
) {
  return new Response(result.audio, {
    headers: {
      "Content-Type": result.mime,
      "Cache-Control": "public, max-age=86400",
      "X-Voice-Engine": result.engine,
      "X-Voice-Label": engineLabel(result.engine),
      "X-Voice-Name": result.voice || result.cast || "neural",
      "X-Voice-Cast": result.cast || "",
      "X-Voice-Cache": cache,
    },
  });
}

function storedRequest(agentId: string, text: string, locale: string) {
  return new Request(`https://binanceff.voice/v1/${encodeURIComponent(voiceCacheKey(agentId, text, locale))}`);
}

async function readStored(agentId: string, text: string, locale: string) {
  if (typeof caches === "undefined") return null;
  try {
    const hit = await caches.default.match(storedRequest(agentId, text, locale));
    return hit ?? null;
  } catch {
    return null;
  }
}

async function writeStored(agentId: string, text: string, locale: string, response: Response) {
  if (typeof caches === "undefined") return;
  try {
    await caches.default.put(storedRequest(agentId, text, locale), response.clone());
  } catch {
    /* cache API unavailable */
  }
}

async function cannedTake(agentId: string, text: string, locale: string, request: Request) {
  const canned = cannedVoiceSrc(agentId, text, locale);
  if (!canned) return null;
  const asset = await fetch(new URL(canned, request.url));
  if (!asset.ok) return null;
  const profile = voiceProfile(agentId);
  return {
    result: {
      audio: new Uint8Array(await asset.arrayBuffer()),
      mime: "audio/mpeg",
      engine: "edge",
      voice: profile.edgeVoice,
      cast: profile.cast,
    },
    cache: "canned" as const,
  };
}

async function storedTake(agentId: string, text: string, locale: string) {
  const stored = await readStored(agentId, text, locale);
  if (!stored) return null;
  return {
    result: {
      audio: new Uint8Array(await stored.arrayBuffer()),
      mime: stored.headers.get("content-type") || "audio/mpeg",
      engine: stored.headers.get("x-voice-engine") || "edge",
      voice: stored.headers.get("x-voice-name") || "neural",
      cast: stored.headers.get("x-voice-cast") || "",
    },
    cache: "hit" as const,
  };
}

async function synthesize(agentId: string, text: string, locale: string, request: Request) {
  const secrets = await readSecrets();
  const best = plannedEngines(secrets)[0] || "edge";
  const stored = await storedTake(agentId, text, locale);
  const canned = stored ? null : await cannedTake(agentId, text, locale, request);
  const recorded = stored ?? canned;

  if (recorded && !shouldUpgradeVoice(recorded.result.engine, best)) {
    return recorded;
  }

  try {
    const result = await synthesizeSpeech({
      agentId,
      text,
      locale,
      secrets,
      betterThan: recorded?.result.engine || "",
    });
    return { result, cache: recorded ? "upgrade" as const : "miss" as const };
  } catch (error) {
    if (recorded) return recorded;
    throw error;
  }
}

async function voiceReply(agentId: string, text: string, locale: string, request: Request) {
  const { result, cache } = await synthesize(agentId, text, locale, request);
  const response = audioResponse(result, cache);
  if (cache === "miss" || cache === "upgrade") await writeStored(agentId, text, locale, response);
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!url.searchParams.get("text")) {
    const secrets = await readSecrets();
    const engines = plannedEngines(secrets);
    return Response.json({ bestEngine: engines[0] || "edge", engines });
  }
  const parsed = parseRequest({
    agentId: url.searchParams.get("agentId") ?? undefined,
    text: url.searchParams.get("text") ?? undefined,
    locale: url.searchParams.get("locale") ?? undefined,
  });
  if (!parsed) return Response.json({ error: "text required" }, { status: 400 });
  try {
    return await voiceReply(parsed.agentId, parsed.text, parsed.locale, request);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "voice_failed" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = parseRequest({
    agentId: typeof body.agentId === "string" ? body.agentId : undefined,
    text: typeof body.text === "string" ? body.text : undefined,
    locale: typeof body.locale === "string" ? body.locale : undefined,
  });
  if (!parsed) return Response.json({ error: "text required" }, { status: 400 });
  try {
    return await voiceReply(parsed.agentId, parsed.text, parsed.locale, request);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "voice_failed" }, { status: 502 });
  }
}
