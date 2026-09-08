import { engineLabel, speakableText, voiceProfile } from "./agent-voice.mjs";

export { engineLabel };

export const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
export const SEC_MS_GEC_VERSION = "1-143.0.3650.75";
export const WIN_EPOCH = 11644473600;

export function voiceSecretsFrom(bag = {}) {
  return {
    elevenLabs: String(bag.ELEVENLABS_API_KEY || bag.elevenLabs || "").trim(),
    openai: String(bag.OPENAI_API_KEY || bag.openai || "").trim(),
  };
}

export function plannedEngines(secrets) {
  const keys = voiceSecretsFrom(secrets);
  const order = [];
  if (keys.elevenLabs) order.push("elevenlabs");
  if (keys.openai) order.push("openai");
  order.push("edge", "polly");
  return order;
}

export function escapeSsml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function prosodyPercent(value, scale = 100) {
  const pct = Math.round((Number(value || 1) - 1) * scale);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

export function taggedElevenText(profile, text) {
  const line = speakableText(text);
  const tag = String(profile?.elevenTag || "").trim();
  if (!tag || /^\s*\[/.test(line)) return line;
  return `${tag} ${line}`;
}

export function edgePitchHz(pitch) {
  const hz = Math.round((Number(pitch || 1) - 1) * 18);
  return `${hz >= 0 ? "+" : ""}${hz}Hz`;
}

export function buildEdgeSsml(profile, text) {
  const line = escapeSsml(speakableText(text));
  const lang = profile.lang || "en-US";
  const voice = profile.edgeVoice || "en-US-JennyNeural";
  const rate = prosodyPercent(profile.rate, 100);
  const pitch = edgePitchHz(profile.pitch);
  return [
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'>`,
    `<voice name='${voice}'>`,
    `<prosody pitch='${pitch}' rate='${rate}' volume='+0%'>${line}</prosody>`,
    "</voice></speak>",
  ].join("");
}

export function secMsGecPayload(nowUnix = Date.now() / 1000) {
  let ticks = Math.floor(Number(nowUnix)) + WIN_EPOCH;
  ticks -= ticks % 300;
  return `${ticks * 10_000_000}${TRUSTED_CLIENT_TOKEN}`;
}

export async function generateSecMsGec(nowUnix = Date.now() / 1000) {
  const payload = secMsGecPayload(nowUnix);
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(payload).digest("hex").toUpperCase();
}

function requestId() {
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/-/g, "").toUpperCase();
}

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0";
const EDGE_ORIGIN = "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold";

function stamp() {
  return new Date().toISOString().replace(/\.\d+Z$/, "Z");
}

function edgeConfigMessage() {
  return [
    `X-Timestamp:${stamp()}`,
    "Content-Type:application/json; charset=utf-8",
    "Path:speech.config",
    "",
    JSON.stringify({
      context: {
        synthesis: {
          audio: {
            metadataoptions: { sentenceBoundaryEnabled: "false", wordBoundaryEnabled: "false" },
            outputFormat: "audio-24khz-48kbitrate-mono-mp3",
          },
        },
      },
    }),
  ].join("\r\n");
}

function edgeSsmlMessage(ssml, id) {
  return [
    `X-RequestId:${id}`,
    "Content-Type:application/ssml+xml",
    `X-Timestamp:${stamp()}`,
    "Path:ssml",
    "",
    ssml,
  ].join("\r\n");
}

function audioFromEdgeFrame(data) {
  const buffer = data instanceof ArrayBuffer ? data : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  if (buffer.byteLength < 2) return null;
  const headerLen = new DataView(buffer).getUint16(0);
  const start = 2 + headerLen;
  if (start >= buffer.byteLength) return null;
  return new Uint8Array(buffer, start);
}

async function readWsData(data) {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return data;
  if (ArrayBuffer.isView(data)) return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  if (typeof Blob !== "undefined" && data instanceof Blob) return data.arrayBuffer();
  return data;
}

function listen(socket, type, handler) {
  if (typeof socket.addEventListener === "function") socket.addEventListener(type, handler);
  else if (typeof socket.on === "function") socket.on(type, handler);
}

function waitSocketOpen(socket, timeoutMs = 8000) {
  if (socket.readyState === 1) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("edge_open_timeout")), timeoutMs);
    listen(socket, "open", () => {
      clearTimeout(timer);
      resolve();
    });
    listen(socket, "error", () => {
      clearTimeout(timer);
      reject(new Error("edge_ws_error"));
    });
  });
}

async function openEdgeSocket(url) {
  const headers = {
    "User-Agent": BROWSER_UA,
    Origin: EDGE_ORIGIN,
    Pragma: "no-cache",
    "Cache-Control": "no-cache",
  };

  try {
    const httpsUrl = new URL(url);
    httpsUrl.protocol = "https:";
    const response = await fetch(httpsUrl, {
      headers: { ...headers, Upgrade: "websocket", Connection: "Upgrade" },
    });
    if (response.webSocket) {
      response.webSocket.accept?.();
      response.webSocket.binaryType = "arraybuffer";
      return response.webSocket;
    }
  } catch {
    /* Node and some workers reject the upgrade fetch */
  }

  try {
    const { default: WS } = await import("ws");
    const socket = new WS(String(url), { headers });
    socket.binaryType = "arraybuffer";
    return socket;
  } catch {
    /* optional */
  }

  if (typeof WebSocket === "undefined") throw new Error("edge_ws_unavailable");
  const socket = new WebSocket(url);
  socket.binaryType = "arraybuffer";
  return socket;
}

function asArrayBuffer(data) {
  if (data instanceof ArrayBuffer) return data;
  if (ArrayBuffer.isView(data)) return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  return null;
}

export async function synthesizeEdgeNeural(profile, text) {
  const id = requestId();
  const gec = await generateSecMsGec();
  const url = new URL("wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1");
  url.searchParams.set("TrustedClientToken", TRUSTED_CLIENT_TOKEN);
  url.searchParams.set("ConnectionId", id);
  url.searchParams.set("Sec-MS-GEC", gec);
  url.searchParams.set("Sec-MS-GEC-Version", SEC_MS_GEC_VERSION);

  const socket = await openEdgeSocket(url);
  const chunks = [];

  const finished = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("edge_synth_timeout")), 16000);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    const onMessage = async (event, isBinary) => {
      try {
        const raw = event?.data ?? event;
        if (typeof raw === "string" || isBinary === false) {
          const body = String(raw);
          if (/SSML is invalid/i.test(body)) throw new Error("edge_ssml_invalid");
          if (/Path:turn.end/i.test(body)) done();
          return;
        }
        const payload = typeof raw === "string" ? raw : await readWsData(raw);
        if (typeof payload === "string") {
          if (/Path:turn.end/i.test(payload)) done();
          return;
        }
        const audio = audioFromEdgeFrame(asArrayBuffer(payload) ?? payload);
        if (audio?.byteLength) chunks.push(audio);
      } catch (error) {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error("edge_ws_error"));
      }
    };
    if (typeof socket.on === "function") socket.on("message", (data, binary) => onMessage(data, binary));
    else listen(socket, "message", onMessage);
    listen(socket, "error", () => {
      clearTimeout(timer);
      reject(new Error("edge_ws_error"));
    });
    listen(socket, "close", done);
  });

  try {
    await waitSocketOpen(socket);
    socket.send(edgeConfigMessage());
    socket.send(edgeSsmlMessage(buildEdgeSsml(profile, text), id));
    await finished;
  } finally {
    try { socket.close(); } catch { /* ignore */ }
  }

  if (!chunks.length) throw new Error("edge_empty_audio");
  const bytes = concatBytes(chunks);
  if (bytes.byteLength < 200) throw new Error("edge_empty_audio");
  return { audio: bytes, mime: "audio/mpeg", engine: "edge", voice: profile.edgeVoice, cast: profile.cast };
}

function concatBytes(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

async function synthesizeElevenLabs(profile, text, apiKey, fetchImpl = fetch) {
  const voiceId = profile.elevenLabsVoiceId;
  const attempts = [
    { model: "eleven_v3", body: { text: taggedElevenText(profile, text), model_id: "eleven_v3" } },
    {
      model: "eleven_multilingual_v2",
      body: {
        text: speakableText(text),
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.38, similarity_boost: 0.82, style: 0.42, use_speaker_boost: true },
      },
    },
  ];
  let lastError = "eleven_failed";
  for (const attempt of attempts) {
    const response = await fetchImpl(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify(attempt.body),
    });
    if (!response.ok) {
      lastError = `eleven_${response.status}`;
      continue;
    }
    const audio = new Uint8Array(await response.arrayBuffer());
    if (audio.byteLength < 200) continue;
    return { audio, mime: "audio/mpeg", engine: "elevenlabs", voice: `${profile.cast}/${attempt.model}`, cast: profile.cast };
  }
  throw new Error(lastError);
}

async function synthesizeOpenAI(profile, text, apiKey, fetchImpl = fetch) {
  const attempts = [
    {
      model: "gpt-4o-mini-tts",
      body: {
        model: "gpt-4o-mini-tts",
        voice: profile.openaiVoice,
        input: speakableText(text),
        instructions: profile.direction,
        response_format: "mp3",
      },
    },
    {
      model: "tts-1-hd",
      body: { model: "tts-1-hd", voice: profile.openaiVoice, input: speakableText(text), response_format: "mp3" },
    },
  ];
  let lastError = "openai_failed";
  for (const attempt of attempts) {
    const response = await fetchImpl("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(attempt.body),
    });
    if (!response.ok) {
      lastError = `openai_${response.status}`;
      continue;
    }
    const audio = new Uint8Array(await response.arrayBuffer());
    if (audio.byteLength < 200) continue;
    return { audio, mime: "audio/mpeg", engine: "openai", voice: `${profile.openaiVoice}/${attempt.model}`, cast: profile.cast };
  }
  throw new Error(lastError);
}

async function synthesizePolly(profile, text, fetchImpl = fetch) {
  const voices = [profile.pollyVoice, profile.gender === "female" ? "Joanna" : "Matthew"].filter(Boolean);
  let lastError = "polly_failed";
  for (const voice of voices) {
    const url = new URL("https://api.streamelements.com/kappa/v2/speech");
    url.searchParams.set("voice", voice);
    url.searchParams.set("text", speakableText(text).slice(0, 300));
    const response = await fetchImpl(url, { headers: { Accept: "audio/mpeg" } });
    if (!response.ok) {
      lastError = `polly_${response.status}`;
      continue;
    }
    const audio = new Uint8Array(await response.arrayBuffer());
    if (audio.byteLength < 200) continue;
    return { audio, mime: "audio/mpeg", engine: "polly", voice, cast: profile.cast };
  }
  throw new Error(lastError);
}

export async function synthesizeSpeech({
  agentId,
  text,
  secrets = {},
  fetchImpl = fetch,
  edgeSynth = synthesizeEdgeNeural,
} = {}) {
  const profile = voiceProfile(agentId);
  const line = String(text || "").trim();
  if (!line) throw new Error("empty_text");
  const keys = voiceSecretsFrom(secrets);
  const errors = [];

  const run = async (engine, task) => {
    try {
      return await task();
    } catch (error) {
      errors.push(`${engine}:${error instanceof Error ? error.message : "failed"}`);
      return null;
    }
  };

  if (keys.elevenLabs) {
    const hit = await run("elevenlabs", () => synthesizeElevenLabs(profile, line, keys.elevenLabs, fetchImpl));
    if (hit) return hit;
  }
  if (keys.openai) {
    const hit = await run("openai", () => synthesizeOpenAI(profile, line, keys.openai, fetchImpl));
    if (hit) return hit;
  }
  const edge = await run("edge", () => edgeSynth(profile, line));
  if (edge) return edge;
  const polly = await run("polly", () => synthesizePolly(profile, line, fetchImpl));
  if (polly) return polly;
  throw new Error(errors.join(" | ") || "neural_tts_failed");
}
