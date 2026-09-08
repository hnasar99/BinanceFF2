const CLUSTERS = [
  [/^ch|^sh|^zh|^j/, "CH"],
  [/^th/, "TH"],
  [/^qu/, "kk"],
  [/^oo|^uu/, "U"],
  [/^ee|^ii/, "I"],
  [/^ph|^f|^v/, "FF"],
  [/^ck|^k|^c|^g|^q|^x/, "kk"],
  [/^b|^m|^p/, "PP"],
  [/^s|^z/, "SS"],
  [/^d|^t/, "DD"],
  [/^n|^l/, "nn"],
  [/^r/, "RR"],
  [/^w|^u/, "U"],
  [/^y|^i/, "I"],
  [/^o/, "O"],
  [/^e/, "E"],
  [/^a/, "aa"],
  [/^[\s.,!?;:\-'"()]+/, "sil"],
];

const VOWELS = new Set(["aa", "E", "I", "O", "U"]);

export const VISEME_OPENNESS = {
  sil: 0,
  PP: 0.04,
  FF: 0.16,
  TH: 0.26,
  DD: 0.2,
  kk: 0.18,
  CH: 0.3,
  SS: 0.14,
  nn: 0.18,
  RR: 0.22,
  aa: 0.78,
  E: 0.36,
  I: 0.26,
  O: 0.54,
  U: 0.4,
};

export const VISEME_WIDTH = {
  sil: 1,
  PP: 0.9,
  FF: 1.04,
  TH: 0.96,
  DD: 0.98,
  kk: 0.94,
  CH: 0.88,
  SS: 1.06,
  nn: 0.97,
  RR: 0.93,
  aa: 0.98,
  E: 1.18,
  I: 1.12,
  O: 0.7,
  U: 0.66,
};

export function normalizeVisemeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function isSpeechMorph(name) {
  return /^(viseme|mouthopen|jawopen|mouthfunnel|mouthpucker|mouthclose)/.test(normalizeVisemeName(name));
}

export function visemeMorphKeys(viseme) {
  const key = String(viseme || "sil");
  const aliases = {
    sil: ["visemesil", "sil", "mouthclose", "viseme0"],
    aa: ["visemeaa", "visemeaa", "aa", "jawopen", "mouthopen", "viseme1"],
    E: ["visemee", "e", "viseme2"],
    I: ["visemei", "i", "viseme3"],
    O: ["visemeo", "o", "mouthfunnel", "viseme4"],
    U: ["visemeu", "u", "mouthpucker", "viseme5"],
    PP: ["visemepp", "pp", "viseme6"],
    FF: ["visemeff", "ff", "viseme7"],
    TH: ["visemeth", "th", "viseme8"],
    DD: ["visemedd", "dd", "viseme9"],
    kk: ["visemekk", "kk", "viseme10"],
    CH: ["visemech", "ch", "viseme11"],
    SS: ["visemess", "ss", "viseme12"],
    nn: ["visemenn", "nn", "viseme13"],
    RR: ["visemerr", "rr", "viseme14"],
  };
  return aliases[key] ?? [normalizeVisemeName(key)];
}

export function textToVisemes(text, rate = 0.95) {
  const src = String(text || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    let matched = false;
    for (const [pattern, viseme] of CLUSTERS) {
      const hit = src.slice(i).match(pattern);
      if (!hit) continue;
      const consume = hit[0].length;
      const duration = VOWELS.has(viseme) ? 1.35 : viseme === "sil" ? 0.5 : 0.82;
      tokens.push({ viseme, charIndex: i, duration });
      i += consume;
      matched = true;
      break;
    }
    if (!matched) i += 1;
  }

  const pace = 78 / Math.max(0.5, Number(rate) || 0.95);
  let cursor = 0;
  return tokens.map((token) => {
    const startMs = cursor;
    const endMs = cursor + token.duration * pace;
    cursor = endMs;
    return {
      viseme: token.viseme,
      charIndex: token.charIndex,
      startMs,
      endMs,
      openness: VISEME_OPENNESS[token.viseme] ?? 0.2,
      width: VISEME_WIDTH[token.viseme] ?? 1,
    };
  });
}

export function fitVisemesToDuration(track, durationMs) {
  const list = Array.isArray(track) ? track : [];
  const target = Number(durationMs);
  const end = list.at(-1)?.endMs ?? 0;
  if (!list.length || !Number.isFinite(target) || target <= 0 || end <= 0) return list;
  const scale = target / end;
  return list.map((token) => ({
    ...token,
    startMs: token.startMs * scale,
    endMs: token.endMs * scale,
  }));
}

export function visemeAt(track, timeMs) {
  if (!track.length) return { viseme: "sil", openness: 0, width: 1, mix: 0 };
  if (timeMs <= track[0].startMs) return { ...track[0], mix: 0 };
  const last = track[track.length - 1];
  if (timeMs >= last.endMs) return { viseme: "sil", openness: 0, width: 1, mix: 0 };

  for (let i = 0; i < track.length; i += 1) {
    const current = track[i];
    if (timeMs < current.endMs || i === track.length - 1) {
      const next = track[i + 1];
      const span = Math.max(1, current.endMs - current.startMs);
      const blend = Math.min(1, Math.max(0, (timeMs - current.startMs) / span));
      if (!next) return { ...current, mix: blend };
      return {
        viseme: blend > 0.55 ? next.viseme : current.viseme,
        openness: current.openness + (next.openness - current.openness) * blend,
        width: current.width + (next.width - current.width) * blend,
        mix: blend,
      };
    }
  }
  return { viseme: "sil", openness: 0, width: 1, mix: 0 };
}
