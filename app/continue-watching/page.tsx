import type { Metadata } from "next";
import { ContinueWatchingClient } from "./ContinueWatchingClient";

export const metadata: Metadata = {
  title: "Continue Watching - Wave Anime",
  description: "Pick up where you left off. Resume your anime episodes and track playback progress.",
};

export default function ContinueWatchingPage() {
  return <ContinueWatchingClient />;
}
