"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translate, type Locale } from "./i18n";

type SpatialI18n = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (value: string) => string;
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
  const [locale, setLocaleState] = useState<Locale>(preferredLocale);
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem("binanceff2-locale", next);
  }, []);
  const t = useCallback((value: string) => translate(locale, value), [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

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
