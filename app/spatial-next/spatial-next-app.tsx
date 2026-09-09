"use client";

import { SpatialI18nProvider } from "../spatial/i18n-context";
import { CinematicOverlay } from "./cinematic-overlay";
import { OpsHud } from "./ops-hud";
import { OpsProvider } from "./ops-context";
import "./spatial-next.css";

export function SpatialNextApp() {
  return (
    <SpatialI18nProvider>
      <OpsProvider>
        <div className="cockpit-root">
          <CinematicOverlay />
          <OpsHud />
        </div>
      </OpsProvider>
    </SpatialI18nProvider>
  );
}
