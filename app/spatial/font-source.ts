import type { FontFamilies } from "@pmndrs/uikit";

export const HUD_CHARSET = [
  " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  "ÁÉÍÓÚÜÑáéíóúüñÃÕÇãõçÀÂÊÔàâêôÍíÓó",
  "!?.,;:'\"()-[]{}@#$%&*+=/\\<>_%°€",
  "·–—•●◆◎◇⌂▶▾▴→←↑↓♫",
].join("");

export const HUD_FONT_INPUT = {
  url: "/fonts/Inter-Medium.ttf",
  charset: HUD_CHARSET,
  fontSize: 42,
  textureSize: [1024, 1024] as [number, number],
};

export function wrapFontResult(result: unknown): FontFamilies {
  const face = firstFont(result) as never;
  return {
    inter: {
      medium: face,
      bold: face,
    },
  };
}

function firstFont(result: unknown) {
  if (result && typeof result === "object" && "chars" in result) return result;
  if (result && typeof result === "object") {
    const family = Object.values(result as Record<string, unknown>)[0];
    if (family && typeof family === "object") {
      const weight = Object.values(family as Record<string, unknown>)[0];
      if (weight) return weight;
    }
  }
  return result;
}
