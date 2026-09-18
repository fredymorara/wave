import type { Metadata } from "next";
import { Suspense } from "react";
import SearchClient from "./SearchClient";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Browse Anime Catalog & Directory - Filter by Genre, Year & Rating",
  description:
    "Explore thousands of anime series and movies. Filter by genre, release year, format, rating, and status on Wave Anime. Fast search alternative to Aniwave and HiAnime.",
  keywords: [
    "browse anime",
    "anime catalog",
    "anime genres",
    "action anime",
    "romance anime",
    "top rated anime",
    "anime search engine",
    "aniwave search",
  ],
  openGraph: {
    title: "Browse Anime Catalog & Directory | Wave Anime",
    description:
      "Explore thousands of anime series and movies with instant genre filters and cyber HUD.",
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
      <SearchClient />
    </Suspense>
  );
}
