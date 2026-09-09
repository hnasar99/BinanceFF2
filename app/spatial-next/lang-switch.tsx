"use client";

import { languages } from "../spatial/i18n";
import { useSpatialI18n } from "../spatial/i18n-context";

export function LangSwitch() {
  const { locale, setLocale, t } = useSpatialI18n();
  return (
    <div className="lang-switch" role="group" aria-label={t("Language")}>
      {languages.map((language) => (
        <button
          key={language.id}
          type="button"
          aria-pressed={locale === language.id}
          className={locale === language.id ? "is-on" : ""}
          onClick={() => setLocale(language.id)}
        >
          {language.short}
        </button>
      ))}
    </div>
  );
}
