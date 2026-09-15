"use client";

import { useSyncExternalStore, useState } from "react";
import { useSpatialI18n } from "../spatial/i18n-context";

const TOUR_KEY = "binanceff2-spatial-tour-v1";

const STEPS = [
  {
    title: "Write your mission",
    body: "Say what you want in everyday language. The squad will split it into tasks.",
  },
  {
    title: "See who does each task",
    body: "Each step names the agent in charge. Click them to inspect their work.",
  },
  {
    title: "Open the result",
    body: "When a task finishes, open the blackboard or the squad log to read the evidence.",
  },
];

function subscribeTour() {
  return () => {};
}

function readTourStep() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOUR_KEY) === "done" ? null : 0;
}

export function OnboardingTour() {
  const { t } = useSpatialI18n();
  const stored = useSyncExternalStore(subscribeTour, readTourStep, () => 0);
  const [override, setOverride] = useState<number | null | "stored">("stored");
  const step = override === "stored" ? stored : override;

  const dismiss = () => {
    window.localStorage.setItem(TOUR_KEY, "done");
    setOverride(null);
  };

  if (step === null) return null;
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="ops-tour" role="dialog" aria-labelledby="ops-tour-title" aria-describedby="ops-tour-body">
      <p className="ops-tour-kicker">{t("Quick tour")}</p>
      <h2 id="ops-tour-title">{t(current.title)}</h2>
      <p id="ops-tour-body">{t(current.body)}</p>
      <ol className="ops-tour-steps" aria-label={t("Tour steps")}>
        {STEPS.map((item, index) => (
          <li key={item.title} className={index === step ? "is-now" : index < step ? "is-done" : ""}>
            {t(item.title)}
          </li>
        ))}
      </ol>
      <div className="ops-tour-actions">
        <button type="button" onClick={dismiss}>{t("Skip tour")}</button>
        <button
          type="button"
          className="cmd-primary"
          onClick={() => {
            if (last) {
              dismiss();
              return;
            }
            const next = step + 1;
            setOverride(next);
          }}
        >
          {last ? t("Got it") : t("Next")}
        </button>
      </div>
    </div>
  );
}
