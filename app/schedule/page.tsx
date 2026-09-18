import type { Metadata } from "next";
import { Suspense } from "react";
import ScheduleClient from "./ScheduleClient";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Anime Airing Schedule & Simulcast Release Calendar",
  description:
    "Track daily anime broadcast schedules, simulcast countdowns, and upcoming episode air dates in real time on Wave Anime. Free and updated 24/7.",
  keywords: [
    "anime schedule",
    "anime release dates",
    "simulcast schedule",
    "airing anime today",
    "weekly anime calendar",
    "wave anime schedule",
  ],
  openGraph: {
    title: "Anime Airing Schedule & Simulcast Release Calendar | Wave Anime",
    description:
      "Track daily anime broadcast schedules, countdowns, and upcoming episode air dates in real time.",
  },
};

export default function Page() {
  return (
    <Suspense 
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-screen bg-void-black">
          <Loader2 className="w-12 h-12 text-cyber-cyan animate-spin" />
        </div>
      }
    >
      <ScheduleClient />
    </Suspense>
  );
}
