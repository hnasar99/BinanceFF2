"use client";

import type { FontFamilies } from "@pmndrs/uikit";
import { getPreloadedFonts } from "./preload";

export { HUD_CHARSET, wrapFontResult } from "./font-source";

export function useHudFontFamilies(): FontFamilies {
  const fonts = getPreloadedFonts();
  if (!fonts) {
    throw new Error("HUD fonts must be preloaded before mounting the spatial HUD");
  }
  return fonts;
}
