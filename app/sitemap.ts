import type { MetadataRoute } from "next";
import { anilistApi } from "@/lib/api/anilist";

export const revalidate = 3600; // Hourly ISR revalidation

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://waveanime.me";

  // Core static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/schedule`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/continue-watching`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  try {
    // Fetch current trending and airing anime
    const [trending, schedule] = await Promise.all([
      anilistApi.getTrending(25).catch(() => []),
      anilistApi.getAiringSchedule(25).catch(() => []),
    ]);

    const seenIds = new Set<number>();
    const dynamicRoutes: MetadataRoute.Sitemap = [];

    // Map trending anime
    trending.forEach((anime) => {
      if (anime.idMal && !seenIds.has(anime.idMal)) {
        seenIds.add(anime.idMal);
        dynamicRoutes.push({
          url: `${siteUrl}/anime/${anime.idMal}`,
          lastModified: new Date(),
          changeFrequency: "daily",
          priority: 0.85,
        });
        dynamicRoutes.push({
          url: `${siteUrl}/watch/${anime.idMal}/1`,
          lastModified: new Date(),
          changeFrequency: "daily",
          priority: 0.8,
        });
      }
    });

    // Map airing schedule anime
    schedule.forEach((anime) => {
      if (anime.idMal && !seenIds.has(anime.idMal)) {
        seenIds.add(anime.idMal);
        dynamicRoutes.push({
          url: `${siteUrl}/anime/${anime.idMal}`,
          lastModified: new Date(),
          changeFrequency: "hourly",
          priority: 0.85,
        });
      }
    });

    return [...staticRoutes, ...dynamicRoutes];
  } catch {
    return staticRoutes;
  }
}
