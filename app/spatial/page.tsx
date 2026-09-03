import type { Metadata } from "next";
import { SpatialInterface } from "./spatial-interface";

export const metadata: Metadata = {
  title: "Spatial Command | BinanceFF2",
  description: "A fully spatial command layer for the BinanceFF2 agent economy.",
};

export default function SpatialPage() {
  return <SpatialInterface />;
}
