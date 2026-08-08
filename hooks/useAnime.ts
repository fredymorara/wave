import { useQuery } from "@tanstack/react-query";
import { anilistApi } from "@/lib/api/anilist";

export function useTopAnime(limit = 15) {
  return useQuery({
    queryKey: ["anime", "top", limit],
    queryFn: () => anilistApi.getPopular(limit),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useTrendingAnime(limit = 15, page = 1) {
  return useQuery({
    queryKey: ["anime", "trending", limit, page],
    queryFn: () => anilistApi.getTrending(limit, page),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useRecentEpisodes(limit = 20) {
  return useQuery({
    queryKey: ["anime", "recent", limit],
    queryFn: () => anilistApi.getRecentReleases(limit),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useTopThisWeek(limit = 9) {
  return useQuery({
    queryKey: ["anime", "top-this-week", limit],
    queryFn: () => anilistApi.getTopThisWeek(limit),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useSchedule(limit = 15) {
  return useQuery({
    queryKey: ["anime", "schedule", limit],
    queryFn: () => anilistApi.getAiringSchedule(limit),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useSearchAnime(query: string, filters?: { genre?: string; year?: number; format?: string; sort?: string }) {
  return useQuery({
    queryKey: ["anime", "search", query, filters],
    queryFn: () => anilistApi.searchAnime(query, filters),
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: query.length >= 3 || !!filters?.genre || !!filters?.year || !!filters?.format,
  });
}

export function useAniListBanners(limit = 10, page = 1) {
  return useQuery({
    queryKey: ["anime", "anilist-banners", limit, page],
    queryFn: () => anilistApi.getTrending(limit, page),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useAnimeDetails(malId: string | number) {
  return useQuery({
    queryKey: ["anime", malId, "details"],
    queryFn: () => anilistApi.getAnimeDetails(malId),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    enabled: !!malId,
  });
}
