"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { interpolate, translate, translateLine, type Locale } from "./i18n";

type SpatialI18n = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (value: string, vars?: Record<string, string | number>) => string;
  line: (value: string) => string;
};

const SpatialI18nContext = createContext<SpatialI18n | null>(null);

function preferredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem("binanceff2-locale");
  if (stored === "en" || stored === "es" || stored === "pt") return stored;
  const browserLocale = window.navigator.language.toLowerCase();
  return browserLocale.startsWith("es") ? "es" : browserLocale.startsWith("pt") ? "pt" : "en";
}

export function SpatialI18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem("binanceff2-locale", next);
  }, []);
  const t = useCallback((value: string, vars?: Record<string, string | number>) => {
    const text = translate(locale, value);
    return vars ? interpolate(text, vars) : text;
  }, [locale]);
  const line = useCallback((value: string) => translateLine(locale, value), [locale]);
  const value = useMemo(() => ({ locale, setLocale, t, line }), [line, locale, setLocale, t]);

  useEffect(() => {
    setLocaleState(preferredLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "pt" ? "pt-BR" : locale;
  }, [locale]);

  return <SpatialI18nContext.Provider value={value}>{children}</SpatialI18nContext.Provider>;
}

export function useSpatialI18n(): SpatialI18n {
  const i18n = useContext(SpatialI18nContext);
  if (!i18n) throw new Error("useSpatialI18n must be used inside SpatialI18nProvider");
  return i18n;
}
