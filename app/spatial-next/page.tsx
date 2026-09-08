import { BabylonCommandCenter } from "./babylon-command-center";
import { CharacterRoster } from "./character-roster";
import { CinematicOverlay } from "./cinematic-overlay";
import "./spatial-next.css";

export default function SpatialNextPage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
      <BabylonCommandCenter />
      <CinematicOverlay />
      <CharacterRoster />
    </div>
  );
}
