"use client";

import { SpatialI18nProvider } from "../spatial/i18n-context";
import { CinematicOverlay } from "./cinematic-overlay";
import { OnboardingTour } from "./onboarding-tour";
import { OpsHud } from "./ops-hud";
import { OpsProvider } from "./ops-context";
import "./spatial-next.css";
import { AgentRuntimeProvider } from "./runtime-context";

export function SpatialNextApp() {
  return (
    <SpatialI18nProvider>
      <AgentRuntimeProvider><OpsProvider>
        <div className="cockpit-root">
          <CinematicOverlay />
          <OnboardingTour />
          <OpsHud />
        </div>
      </OpsProvider></AgentRuntimeProvider>
    </SpatialI18nProvider>
  );
}
