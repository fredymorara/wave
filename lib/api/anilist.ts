import { jikanApi } from "./jikan";

const ANILIST_API_URL = "https://graphql.anilist.co";

export interface AniListAnime {
  id: number;
  idMal: number | null;
  title: {
    english: string | null;
    romaji: string | null;
  };
  bannerImage: string | null;
  coverImage: {
    extraLarge: string;
    large: string;
    color: string | null;
  };
  description: string | null;
  genres: string[];
  episodes: number | null;
  format: string | null;
  status: string | null;
  averageScore: number | null;
  nextAiringEpisode: {
    episode: number;
    airingAt: number;
  } | null;
  seasonYear: number | null;
  startDate?: {
    year?: number | null;
    month?: number | null;
    day?: number | null;
  } | null;
}

const MEDIA_FIELDS = `
  id
  idMal
  type
  title {
    english
    romaji
  }
  bannerImage
  coverImage {
    extraLarge
    large
    color
  }
  description
  genres
  episodes
  format
  status
  averageScore
  nextAiringEpisode {
    episode
    airingAt
  }
  seasonYear
  startDate {
    year
    month
    day
  }
`;

// Circuit breaker state to prevent spamming AniList when disabled/down
let circuitOpenUntil = 0;
const CIRCUIT_BREAKER_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function isAniListCircuitOpen(): boolean {
  return Date.now() < circuitOpenUntil;
}

export function tripAniListCircuit(reason: string) {
  circuitOpenUntil = Date.now() + CIRCUIT_BREAKER_DURATION_MS;
  console.warn(`[AniList Circuit Breaker] Tripped for 5m (${reason}). Falling back to Jikan API.`);
}

async function fetchAniList<T>(query: string, variables: Record<string, string | number | boolean | number[]> = {}): Promise<T> {
  if (isAniListCircuitOpen()) {
    throw new Error("AniList circuit breaker is open (service unavailable)");
  }

  const isClient = typeof window !== "undefined";
  const url = isClient ? "/api/anilist" : ANILIST_API_URL;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (err: unknown) {
    tripAniListCircuit(err instanceof Error ? err.message : "Network error");
    throw err;
  }

  if (!response.ok) {
    if (response.status === 429) {
      // Very basic backoff for AniList (limit is generous: 90 req / min)
      await new Promise((res) => setTimeout(res, 2000));
      const retry = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ query, variables }),
      });
      if (!retry.ok) {
        tripAniListCircuit(`Rate limited (${retry.status})`);
        throw new Error("AniList API Rate Limit Exceeded");
      }
      const json = await retry.json();
      return json.data;
    }

    if (response.status === 403 || response.status >= 500) {
      tripAniListCircuit(`Status ${response.status}`);
    }
    throw new Error(`Failed to fetch AniList data (status: ${response.status})`);
  }

  const json = await response.json();
  if (json.errors && json.errors.length > 0) {
    if (json.errors.some((e: { status?: number; message?: string }) => e.status === 403 || e.message?.includes("disabled"))) {
      tripAniListCircuit("AniList API disabled upstream");
    }
    throw new Error(json.errors[0].message);
  }
  return json.data;
}

export const anilistApi = {
  getTrending: async (limit = 15, page = 1): Promise<AniListAnime[]> => {
    // Used for Hero Carousel and Trending Now
    if (!isAniListCircuitOpen()) {
      try {
        const query = `
          query($limit: Int, $page: Int) {
            Page(page: $page, perPage: $limit) {
              media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
                ${MEDIA_FIELDS}
              }
            }
          }
        `;
        const data = await fetchAniList<{ Page: { media: AniListAnime[] } }>(query, { limit, page });
        return data.Page.media.filter(a => a.idMal);
      } catch (err) {
        console.warn("[AniList getTrending] Failed, using Jikan fallback:", err);
      }
    }
    return jikanApi.getTrending(limit, page);
  },

  getPopular: async (limit = 15): Promise<AniListAnime[]> => {
    // Used for "Most Popular" (All Time)
    if (!isAniListCircuitOpen()) {
      try {
        const query = `
          query($limit: Int) {
            Page(page: 1, perPage: $limit) {
              media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
                ${MEDIA_FIELDS}
              }
            }
          }
        `;
        const data = await fetchAniList<{ Page: { media: AniListAnime[] } }>(query, { limit });
        return data.Page.media.filter(a => a.idMal);
      } catch (err) {
        console.warn("[AniList getPopular] Failed, using Jikan fallback:", err);
      }
    }
    return jikanApi.getPopular(limit);
  },

  getRecentReleases: async (limit = 20): Promise<AniListAnime[]> => {
    // Used for "Recent Releases" (Things that just aired)
    if (!isAniListCircuitOpen()) {
      try {
        const currentTime = Math.floor(Date.now() / 1000);
        const query = `
          query($limit: Int, $time: Int) {
            Page(page: 1, perPage: $limit) {
              airingSchedules(airingAt_lesser: $time, sort: TIME_DESC) {
                media {
                  ${MEDIA_FIELDS}
                }
              }
            }
          }
        `;
        const data = await fetchAniList<{ Page: { airingSchedules: { media: AniListAnime }[] } }>(query, { limit, time: currentTime });
        
        // Extract media, filter duplicates and ensure it has an idMal
        const uniqueMedia = new Map<number, AniListAnime>();
        data.Page.airingSchedules.forEach(schedule => {
          if (schedule.media && schedule.media.idMal && !uniqueMedia.has(schedule.media.idMal)) {
            uniqueMedia.set(schedule.media.idMal, schedule.media);
          }
        });
        return Array.from(uniqueMedia.values());
      } catch (err) {
        console.warn("[AniList getRecentReleases] Failed, using Jikan fallback:", err);
      }
    }
    return jikanApi.getRecentReleases(limit);
  },

  getTopThisWeek: async (limit = 9): Promise<AniListAnime[]> => {
    // Used for "Top Anime This Week" (Highest trending currently airing)
    if (!isAniListCircuitOpen()) {
      try {
        const query = `
          query($limit: Int) {
            Page(page: 1, perPage: $limit) {
              media(status: RELEASING, type: ANIME, sort: TRENDING_DESC, isAdult: false, format: TV) {
                ${MEDIA_FIELDS}
              }
            }
          }
        `;
        const data = await fetchAniList<{ Page: { media: AniListAnime[] } }>(query, { limit });
        return data.Page.media.filter(a => a.idMal);
      } catch (err) {
        console.warn("[AniList getTopThisWeek] Failed, using Jikan fallback:", err);
      }
    }
    return jikanApi.getTopThisWeek(limit);
  },

  getAiringSchedule: async (limit = 15): Promise<AniListAnime[]> => {
    // Used for "Airing Now" (Things airing very soon)
    if (!isAniListCircuitOpen()) {
      try {
        const currentTime = Math.floor(Date.now() / 1000);
        const query = `
          query($limit: Int, $time: Int) {
            Page(page: 1, perPage: $limit) {
              airingSchedules(airingAt_greater: $time, sort: TIME) {
                media {
                  ${MEDIA_FIELDS}
                }
              }
            }
          }
        `;
        const data = await fetchAniList<{ Page: { airingSchedules: { media: AniListAnime }[] } }>(query, { limit, time: currentTime });
        
        // Extract media, filter duplicates and ensure it has an idMal
        const uniqueMedia = new Map<number, AniListAnime>();
        data.Page.airingSchedules.forEach(schedule => {
          if (schedule.media && schedule.media.idMal && !uniqueMedia.has(schedule.media.idMal)) {
            uniqueMedia.set(schedule.media.idMal, schedule.media);
          }
        });
        return Array.from(uniqueMedia.values());
      } catch (err) {
        console.warn("[AniList getAiringSchedule] Failed, using Jikan fallback:", err);
      }
    }
    return jikanApi.getAiringSchedule(limit);
  },

  searchAnime: async (
    search: string,
    filters?: { genre?: string; year?: number; format?: string; sort?: string; score?: number; status?: string },
    limit = 20
  ): Promise<AniListAnime[]> => {
    if (!isAniListCircuitOpen()) {
      try {
        let sort = filters?.sort ? filters.sort : (search ? "SEARCH_MATCH" : "TRENDING_DESC");
        if (sort === "SEARCH_MATCH" && (!search || search.trim().length === 0)) {
          sort = "TRENDING_DESC";
        }
        const query = `
          query($search: String, $limit: Int, $genre: String, $seasonYear: Int, $format: MediaFormat, $status: MediaStatus, $averageScore_greater: Int) {
            Page(page: 1, perPage: $limit) {
              media(
                search: $search, 
                type: ANIME, 
                genre: $genre,
                seasonYear: $seasonYear,
                format: $format,
                status: $status,
                averageScore_greater: $averageScore_greater,
                sort: [${sort}], 
                isAdult: false
              ) {
                ${MEDIA_FIELDS}
              }
            }
          }
        `;
        
        const variables: Record<string, string | number> = { limit };
        if (search && search.trim().length > 0) variables.search = search;
        if (filters?.genre && filters.genre !== "Any") variables.genre = filters.genre;
        if (filters?.year && filters.year > 0) variables.seasonYear = filters.year;
        if (filters?.format && filters.format !== "Any") variables.format = filters.format;
        if (filters?.status && filters.status !== "Any") variables.status = filters.status;
        if (filters?.score && filters.score > 0) variables.averageScore_greater = filters.score;

        const data = await fetchAniList<{ Page: { media: AniListAnime[] } }>(query, variables);
        return data.Page.media.filter(a => a.idMal);
      } catch (err) {
        console.warn("[AniList searchAnime] Failed, using Jikan fallback:", err);
      }
    }
    return jikanApi.searchAnime(search, filters, limit);
  },

  searchAnimePaginated: async (
    search: string,
    filters?: { genre?: string; year?: number; format?: string; sort?: string; score?: number; status?: string },
    limit = 20,
    page = 1
  ): Promise<{ media: AniListAnime[], hasNextPage: boolean }> => {
    if (!isAniListCircuitOpen()) {
      try {
        let sort = filters?.sort ? filters.sort : (search ? "SEARCH_MATCH" : "TRENDING_DESC");
        if (sort === "SEARCH_MATCH" && (!search || search.trim().length === 0)) {
          sort = "TRENDING_DESC";
        }
        const query = `
          query($search: String, $limit: Int, $page: Int, $genre: String, $seasonYear: Int, $format: MediaFormat, $status: MediaStatus, $averageScore_greater: Int) {
            Page(page: $page, perPage: $limit) {
              pageInfo {
                hasNextPage
              }
              media(
                search: $search, 
                type: ANIME, 
                genre: $genre,
                seasonYear: $seasonYear,
                format: $format,
                status: $status,
                averageScore_greater: $averageScore_greater,
                sort: [${sort}], 
                isAdult: false
              ) {
                ${MEDIA_FIELDS}
              }
            }
          }
        `;
        
        const variables: Record<string, string | number> = { limit, page };
        if (search && search.trim().length > 0) variables.search = search;
        if (filters?.genre && filters.genre !== "Any") variables.genre = filters.genre;
        if (filters?.year && filters.year > 0) variables.seasonYear = filters.year;
        if (filters?.format && filters.format !== "Any") variables.format = filters.format;
        if (filters?.status && filters.status !== "Any") variables.status = filters.status;
        if (filters?.score && filters.score > 0) variables.averageScore_greater = filters.score;

        const data = await fetchAniList<{ Page: { pageInfo: { hasNextPage: boolean }, media: AniListAnime[] } }>(query, variables);
        return {
          media: data.Page.media.filter(a => a.idMal),
          hasNextPage: data.Page.pageInfo.hasNextPage
        };
      } catch (err) {
        console.warn("[AniList searchAnimePaginated] Failed, using Jikan fallback:", err);
      }
    }
    return jikanApi.searchAnimePaginated(search, filters, limit, page);
  },

  getAnimeDetails: async (idOrMalId: number | string): Promise<AniListAnime & { recommendations?: AniListAnime[], relations?: (AniListAnime & { relationType: string })[] }> => {
    if (!isAniListCircuitOpen()) {
      try {
        const numId = Number(idOrMalId);
        
        const buildQuery = (isMal: boolean) => `
          query($id: Int) {
            Media(${isMal ? "idMal: $id" : "id: $id"}, type: ANIME) {
              ${MEDIA_FIELDS}
              recommendations(perPage: 10, sort: RATING_DESC) {
                nodes {
                  mediaRecommendation {
                    ${MEDIA_FIELDS}
                  }
                }
              }
              relations {
                edges {
                  relationType
                  node {
                    ${MEDIA_FIELDS}
                  }
                }
              }
            }
          }
        `;

        type DetailResponse = { 
          Media: AniListAnime & { 
            recommendations?: { nodes: { mediaRecommendation: AniListAnime }[] }, 
            relations?: { edges: { relationType: string, node: AniListAnime & { type?: string } }[] } 
          } 
        };

        let data: DetailResponse | null = null;

        // First attempt: try looking up by idMal
        try {
          data = await fetchAniList<DetailResponse>(buildQuery(true), { id: numId });
        } catch {
          // Lookup by idMal failed, will attempt fallback
        }

        // Fallback attempt: if idMal didn't return Media and circuit didn't trip, query by AniList native id
        if (!data?.Media && !isAniListCircuitOpen()) {
          data = await fetchAniList<DetailResponse>(buildQuery(false), { id: numId });
        }

        if (data?.Media) {
          const media: AniListAnime & { recommendations?: AniListAnime[], relations?: (AniListAnime & { relationType: string })[] } = {
            ...data.Media,
            recommendations: undefined,
            relations: undefined
          };
          
          // Map recommendations
          if (data.Media.recommendations?.nodes) {
            media.recommendations = data.Media.recommendations.nodes
              .map((n) => n.mediaRecommendation)
              .filter((r) => r && (r.idMal || r.id));
          }
          
          // Map relations, filter OTHER/MANGA, sort by startDate
          if (data.Media.relations?.edges) {
            const mappedRelations = data.Media.relations.edges
              .map((edge) => ({
                relationType: edge.relationType,
                ...edge.node
              }))
              .filter((r) => 
                r && 
                (r.idMal || r.id) && 
                r.type !== "MANGA" && 
                r.relationType !== "OTHER" &&
                r.relationType !== "CHARACTER"
              );
              
            mappedRelations.sort((a, b) => {
              const dateA = (a.startDate?.year || 9999) * 10000 + (a.startDate?.month || 12) * 100 + (a.startDate?.day || 31);
              const dateB = (b.startDate?.year || 9999) * 10000 + (b.startDate?.month || 12) * 100 + (b.startDate?.day || 31);
              return dateA - dateB;
            });
            
            media.relations = mappedRelations as (AniListAnime & { relationType: string })[];
          }
          
          return media;
        }
      } catch (err) {
        console.warn(`[AniList getAnimeDetails] Failed for ID ${idOrMalId}, using Jikan fallback:`, err);
      }
    }
    return jikanApi.getAnimeDetails(idOrMalId);
  },

  getAnimeTitlesByIds: async (malIds: number[]): Promise<Record<number, string>> => {
    if (!malIds || malIds.length === 0) return {};
    
    if (!isAniListCircuitOpen()) {
      try {
        const query = `
          query($idMal_in: [Int]) {
            Page(page: 1, perPage: 50) {
              media(idMal_in: $idMal_in, type: ANIME) {
                idMal
                title {
                  romaji
                  english
                }
              }
            }
          }
        `;
        const data = await fetchAniList<{ Page: { media: { idMal: number, title: { romaji: string, english: string } }[] } }>(query, { idMal_in: malIds });
        
        const titles: Record<number, string> = {};
        if (data?.Page?.media) {
          data.Page.media.forEach(m => {
            if (m.idMal) {
              titles[m.idMal] = m.title.english || m.title.romaji || `Unknown (${m.idMal})`;
            }
          });
          return titles;
        }
      } catch (e) {
        console.warn("[AniList getAnimeTitlesByIds] Failed, using Jikan fallback:", e);
      }
    }
    return jikanApi.getAnimeTitlesByIds(malIds);
  },
};
