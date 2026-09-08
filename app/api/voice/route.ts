import { cannedVoiceSrc, voiceProfile } from "@/lib/agent-voice";
import { engineLabel, synthesizeSpeech, voiceSecretsFrom } from "@/lib/premium-tts";

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

function parseRequest(source: { agentId?: string; text?: string }) {
  const agentId = String(source.agentId || "scout");
  const text = String(source.text || "").trim().slice(0, MAX_CHARS);
  if (!text) return null;
  voiceProfile(agentId);
  return { agentId, text };
}

function audioResponse(result: { audio: Uint8Array; mime: string; engine: string; voice?: string; cast?: string }) {
  return new Response(result.audio, {
    headers: {
      "Content-Type": result.mime,
      "Cache-Control": "public, max-age=86400",
      "X-Voice-Engine": result.engine,
      "X-Voice-Label": engineLabel(result.engine),
      "X-Voice-Name": result.voice || result.cast || "neural",
      "X-Voice-Cast": result.cast || "",
    },
  });
}

async function synthesize(agentId: string, text: string, request: Request) {
  const canned = cannedVoiceSrc(agentId, text);
  if (canned) {
    const asset = await fetch(new URL(canned, request.url));
    if (asset.ok) {
      const profile = voiceProfile(agentId);
      return {
        audio: new Uint8Array(await asset.arrayBuffer()),
        mime: "audio/mpeg",
        engine: "edge",
        voice: profile.edgeVoice,
        cast: profile.cast,
      };
    }
  }
  const secrets = await readSecrets();
  return synthesizeSpeech({ agentId, text, secrets });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = parseRequest({
    agentId: url.searchParams.get("agentId") ?? undefined,
    text: url.searchParams.get("text") ?? undefined,
  });
  if (!parsed) return Response.json({ error: "text required" }, { status: 400 });
  try {
    return audioResponse(await synthesize(parsed.agentId, parsed.text, request));
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
  });
  if (!parsed) return Response.json({ error: "text required" }, { status: 400 });
  try {
    return audioResponse(await synthesize(parsed.agentId, parsed.text, request));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "voice_failed" }, { status: 502 });
  }
}
