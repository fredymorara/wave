import type { Metadata } from "next";
import ContinueWatchingClient from "@/app/continue-watching/ContinueWatchingClient";

export const metadata: Metadata = {
  title: "Continue Watching & Anime Playback History",
  description:
    "Pick up where you left off. Seamlessly resume your anime episodes and track synchronized playback progress across devices on Wave Anime.",
  keywords: [
    "continue watching anime",
    "anime watch history",
    "resume anime",
    "watch progress",
    "wave anime history",
  ],
  openGraph: {
    title: "Continue Watching & Anime Playback History | Wave Anime",
    description:
      "Resume your anime episodes and watch progress seamlessly across devices.",
  },
};

export default function ContinueWatchingPage() {
  return <ContinueWatchingClient />;
}
