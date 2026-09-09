const FEMALE = /female|woman|girl|samantha|victoria|karen|moira|fiona|tessa|zira|susan|hazel|allison|ava|kate|olivia|emily|joanna|ivy|kendra|salli|amy|emma|jenny|aria|sonia|libby|natasha|catherine|martha|linda|siri|paulina|monica|pilar|sabina|elena|carmen|dalia|elvira|francisca|thalita|yara|lucia|camila|vitoria|google us english female|microsoft zira|microsoft jenny/i;
const MALE = /male|man|boy|david|daniel|alex|fred|tom|mark|james|george|brian|matthew|justin|joey|eric|guy|ryan|nathan|christopher|richard|thomas|oliver|arthur|diego|jorge|pablo|juan|alonso|alvaro|antonio|donato|nicolau|enrique|thiago|ricardo|google us english male|microsoft david|microsoft guy/i;

const LOCALE_VOICES = {
  es: {
    scout: { lang: "es-MX", edgeVoice: "es-MX-DaliaNeural", pollyVoice: "Mia", prefer: ["dalia", "mia", "elena", "sabina"] },
    analyst: { lang: "es-ES", edgeVoice: "es-ES-ElviraNeural", pollyVoice: "Lucia", prefer: ["elvira", "lucia", "moira"] },
    commander: { lang: "es-MX", edgeVoice: "es-MX-JorgeNeural", pollyVoice: "Andres", prefer: ["jorge", "diego", "pablo"] },
    strategist: { lang: "es-AR", edgeVoice: "es-AR-ElenaNeural", pollyVoice: "Mia", prefer: ["elena", "paulina", "carmen"] },
    executor: { lang: "es-ES", edgeVoice: "es-ES-AlvaroNeural", pollyVoice: "Enrique", prefer: ["alvaro", "enrique", "juan"] },
    guardian: { lang: "es-US", edgeVoice: "es-US-AlonsoNeural", pollyVoice: "Pedro", prefer: ["alonso", "jorge", "pablo"] },
  },
  pt: {
    scout: { lang: "pt-BR", edgeVoice: "pt-BR-FranciscaNeural", pollyVoice: "Camila", prefer: ["francisca", "camila", "lucia"] },
    analyst: { lang: "pt-BR", edgeVoice: "pt-BR-ThalitaNeural", pollyVoice: "Vitoria", prefer: ["thalita", "vitoria", "fernanda"] },
    commander: { lang: "pt-BR", edgeVoice: "pt-BR-AntonioNeural", pollyVoice: "Ricardo", prefer: ["antonio", "ricardo"] },
    strategist: { lang: "pt-BR", edgeVoice: "pt-BR-YaraNeural", pollyVoice: "Camila", prefer: ["yara", "francisca"] },
    executor: { lang: "pt-BR", edgeVoice: "pt-BR-DonatoNeural", pollyVoice: "Thiago", prefer: ["donato", "thiago"] },
    guardian: { lang: "pt-BR", edgeVoice: "pt-BR-NicolauNeural", pollyVoice: "Ricardo", prefer: ["nicolau", "antonio"] },
  },
};

export const AGENT_VOICES = {
  scout: {
    id: "scout",
    name: "KAI",
    gender: "female",
    lang: "en-US",
    rate: 1.04,
    pitch: 1.12,
    prefer: ["jenny", "aria", "zira", "samantha", "olivia"],
    cast: "Jessica",
    elevenLabsVoiceId: "cgSgspJ2msm6clMCkdW9",
    elevenTag: "[happily]",
    openaiVoice: "nova",
    edgeVoice: "en-US-JennyNeural",
    edgeStyle: "cheerful",
    pollyVoice: "Ivy",
    direction: "Young female scout. Bright, curious, slightly urgent American English. Clear and alive, never robotic.",
  },
  analyst: {
    id: "analyst",
    name: "LYRA",
    gender: "female",
    lang: "en-GB",
    rate: 0.92,
    pitch: 0.97,
    prefer: ["libby", "sonia", "emma", "moira", "kate"],
    cast: "Lily",
    elevenLabsVoiceId: "pFZP5vAeTsBLp2vC5xTu",
    elevenTag: "[calm]",
    openaiVoice: "sage",
    edgeVoice: "en-GB-SoniaNeural",
    edgeStyle: "customerservice",
    pollyVoice: "Emma",
    direction: "British female analyst. Precise, cool, measured. Slightly lower energy. No warmth-for-show.",
  },
  commander: {
    id: "commander",
    name: "ORION",
    gender: "male",
    lang: "en-US",
    rate: 0.88,
    pitch: 0.78,
    prefer: ["guy", "matthew", "david", "daniel", "arthur"],
    cast: "Daniel",
    elevenLabsVoiceId: "onwK4e9ZLuTAKqWW03F9",
    elevenTag: "[serious]",
    openaiVoice: "ash",
    edgeVoice: "en-US-GuyNeural",
    edgeStyle: "newscast",
    pollyVoice: "Matthew",
    direction: "Male commander. Grounded, strategic, low and steady. Authority without shouting.",
  },
  strategist: {
    id: "strategist",
    name: "NOVA",
    gender: "female",
    lang: "en-US",
    rate: 1.0,
    pitch: 1.06,
    prefer: ["aria", "jenny", "samantha", "ava", "olivia"],
    cast: "Matilda",
    elevenLabsVoiceId: "XrExE9yKIg1WjnnlVkGX",
    elevenTag: "[confident]",
    openaiVoice: "coral",
    edgeVoice: "en-US-AriaNeural",
    edgeStyle: "cheerful",
    pollyVoice: "Joanna",
    direction: "Female strategist. Sharp, confident, clean American English. Smart without being cute.",
  },
  executor: {
    id: "executor",
    name: "REX",
    gender: "male",
    lang: "en-US",
    rate: 0.96,
    pitch: 0.72,
    prefer: ["guy", "eric", "fred", "justin", "brian"],
    cast: "Chris",
    elevenLabsVoiceId: "iP95p4xoKVk53GoZ742B",
    elevenTag: "[firm]",
    openaiVoice: "echo",
    edgeVoice: "en-US-ChristopherNeural",
    edgeStyle: "chat",
    pollyVoice: "Joey",
    direction: "Male executor. Tight, punchy, operational. Short cadence. No softness.",
  },
  guardian: {
    id: "guardian",
    name: "AEGIS",
    gender: "male",
    lang: "en-GB",
    rate: 0.86,
    pitch: 0.84,
    prefer: ["arthur", "george", "daniel", "thomas", "ryan"],
    cast: "George",
    elevenLabsVoiceId: "JBFqnCBsd6RMkjVDRZzb",
    elevenTag: "[reassuring]",
    openaiVoice: "fable",
    edgeVoice: "en-GB-RyanNeural",
    edgeStyle: "chat",
    pollyVoice: "Geraint",
    direction: "British male guardian. Calm, reassuring, protective. Slow enough to sound certain.",
  },
};

export function speakableText(text) {
  return String(text || "")
    .replace(/\bUSDC\b/g, "U S D C")
    .replace(/\bWETH\b/g, "W eth")
    .replace(/\bBNB\b/g, "B N B")
    .replace(/\bROI\b/g, "R O I")
    .replace(/\bDEX\b/g, "decks")
    .replace(/\bLVL\b/g, "level");
}

export function scoreVoice(voice, profile) {
  const name = String(voice?.name || "");
  const lang = String(voice?.lang || "").toLowerCase();
  const want = String(profile?.lang || "en-US").toLowerCase();
  let score = 0;

  if (lang === want) score += 42;
  else if (lang.startsWith(want.slice(0, 2))) score += 28;
  else if (want.startsWith("en") && lang.startsWith("en")) score += 22;
  else score -= 40;

  const female = FEMALE.test(name);
  const male = MALE.test(name);
  if (profile.gender === "female") score += female ? 28 : male ? -34 : 0;
  if (profile.gender === "male") score += male ? 28 : female ? -34 : 0;

  if (/neural|natural|premium|enhanced|wavenet|online/i.test(name)) score += 16;
  if (voice?.localService) score += 4;
  if ((profile.prefer ?? []).some((hint) => name.toLowerCase().includes(hint))) score += 18;
  return score;
}

export function pickVoice(voices, profile) {
  const list = Array.isArray(voices) ? voices : [];
  if (!list.length || !profile) return null;
  return [...list].sort((a, b) => scoreVoice(b, profile) - scoreVoice(a, profile))[0] ?? null;
}

export const AGENT_LINES = {
  scout: "Commander, I found an unusual liquidity movement on Arbitrum.",
  analyst: "The route is viable, but the edge disappears above twenty eight thousand dollars.",
  commander: "Scout found the signal. Analyst validated it. Strategist, build the optimal route.",
  strategist: "Optimal route ready. USDC to WETH on Camelot, exit through Uniswap, projected profit forty two dollars.",
  executor: "Route confirmed. Nonce locked. Execution engine standing by.",
  guardian: "Risk approved. Slippage and exposure remain inside policy.",
};

export const DEPLOY_LINE = "Deploying mission. Agent team assembling.";

const ENGINE_LABEL = {
  elevenlabs: "ELEVEN V3",
  openai: "OPENAI HD",
  edge: "AZURE NEURAL",
  polly: "AMAZON POLLY",
  browser: "BROWSER TTS",
};

export function engineLabel(engine) {
  return ENGINE_LABEL[engine] ?? String(engine || "VOICE").toUpperCase();
}

export const ENGINE_RANK = {
  elevenlabs: 5,
  openai: 4,
  edge: 3,
  polly: 2,
  browser: 1,
};

export function engineRank(engine) {
  return ENGINE_RANK[String(engine || "").toLowerCase()] ?? 0;
}

export function shouldUpgradeVoice(cachedEngine, bestEngine) {
  return engineRank(bestEngine) > engineRank(cachedEngine);
}

export function voiceCacheKey(agentId, text, locale = "en") {
  const lang = locale === "es" || locale === "pt" ? locale : "en";
  return `${String(agentId || "scout").trim()}::${lang}::${String(text || "").trim()}`;
}

export function cannedVoiceSrc(agentId, text, locale = "en") {
  if (locale && locale !== "en") return null;
  const line = String(text || "").trim();
  if (AGENT_LINES[agentId] === line) return `/agents/voice/${agentId}.mp3`;
  if (line === DEPLOY_LINE) return "/agents/voice/deploy.mp3";
  return null;
}

export function voiceProfile(agentId, locale = "en") {
  const base = AGENT_VOICES[agentId] ?? AGENT_VOICES.scout;
  const lang = locale === "es" || locale === "pt" ? locale : "en";
  if (lang === "en") return base;
  const overlay = LOCALE_VOICES[lang]?.[base.id] ?? LOCALE_VOICES[lang].scout;
  return { ...base, ...overlay };
}
