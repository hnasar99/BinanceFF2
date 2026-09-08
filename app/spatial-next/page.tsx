import { BabylonCommandCenter } from "./babylon-command-center";
import { CinematicOverlay } from "./cinematic-overlay";
import "./spatial-next.css";

export default function SpatialNextPage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <BabylonCommandCenter />
      <CinematicOverlay />
    </div>
  );
}
