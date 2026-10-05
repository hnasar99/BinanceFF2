import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { runtimeRequest, runtimeSnapshot } from "@/lib/agent-runtime";

const headers = { "cache-control": "no-store" };
function config() {
  const bindings = env as unknown as { AGENT_RUNTIME_URL?: string; AGENT_RUNTIME_TOKEN?: string };
  if (!bindings.AGENT_RUNTIME_URL || !bindings.AGENT_RUNTIME_TOKEN) return null;
  const url = new URL(bindings.AGENT_RUNTIME_URL);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("Runtime configuration invalid");
  return { url, token: bindings.AGENT_RUNTIME_TOKEN };
}
async function relay(path: string, userId: string, body?: unknown) {
  const c = config();
  if (!c) return Response.json({ connected: false, error: "OpenHuman runtime is not configured", execute: false }, { status: 503, headers });
  const upstream = await fetch(new URL(path, c.url), {
    method: body ? "POST" : "GET", redirect: "error", signal: AbortSignal.timeout(12000),
    headers: { authorization: `Bearer ${c.token}`, "x-runtime-user": userId, "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!upstream.ok) return Response.json({ error: "Runtime request failed", execute: false }, { status: upstream.status === 404 ? 404 : 502, headers });
  const raw = await upstream.text();
  if (raw.length > 300000) throw new Error("Runtime response too large");
  const data = JSON.parse(raw);
  if (path === "/health") {
    if (data.harness !== "openhuman" || data.execute !== false) throw new Error("Unexpected runtime");
    return Response.json({ connected: true, harness: "openhuman", execute: false }, { headers });
  }
  return Response.json({ connected: true, snapshot: runtimeSnapshot.parse(data) }, { headers });
}
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("latest") === "1" ? "latest" : url.searchParams.get("missionId");
    if (!id) {
      if (!config()) return Response.json({ connected: false, execute: false }, { headers });
      return await relay("/health", "health");
    }
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sign in to read your missions" }, { status: 401, headers });
    if (id !== "latest" && !/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Invalid mission" }, { status: 400, headers });
    return await relay(`/missions/${id}`, user.id);
  } catch {
    return Response.json({ connected: false, error: "OpenHuman runtime unavailable", execute: false }, { status: 502, headers });
  }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in to start an agent mission" }, { status: 401, headers });
  try {
    const text = await request.text();
    if (text.length > 10000) return Response.json({ error: "Brief too long" }, { status: 413, headers });
    const parsed = runtimeRequest.safeParse(JSON.parse(text));
    if (!parsed.success) return Response.json({ error: "Add a title and mission brief" }, { status: 400, headers });
    return await relay("/missions", user.id, parsed.data);
  } catch {
    return Response.json({ error: "OpenHuman runtime unavailable", execute: false }, { status: 502, headers });
  }
}
