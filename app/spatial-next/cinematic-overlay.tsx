"use client";

export function CinematicOverlay() {
  return (
    <div className="cockpit-canopy" aria-hidden="true">
      <div className="cockpit-glare" />
      <div className="cockpit-bezel cockpit-bezel-tl" />
      <div className="cockpit-bezel cockpit-bezel-tr" />
      <div className="cockpit-bezel cockpit-bezel-bl" />
      <div className="cockpit-bezel cockpit-bezel-br" />
    </div>
  );
}
