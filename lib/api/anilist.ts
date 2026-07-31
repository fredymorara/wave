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

async function fetchAniList<T>(query: string, variables: Record<string, string | number | boolean | number[]> = {}): Promise<T> {
  const response = await fetch(ANILIST_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      // Very basic backoff for AniList (limit is generous: 90 req / min)
      await new Promise((res) => setTimeout(res, 2000));
      const retry = await fetch(ANILIST_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
      });
      if (!retry.ok) throw new Error("AniList API Rate Limit Exceeded");
      const json = await retry.json();
      return json.data;
    }
    throw new Error("Failed to fetch AniList data");
  }

  const json = await response.json();
  if (json.errors) {
    throw new Error(json.errors[0].message);
  }
  return json.data;
}

export const anilistApi = {
  getTrending: async (limit = 15): Promise<AniListAnime[]> => {
    // Used for Hero Carousel
    const query = `
      query($limit: Int) {
        Page(page: 1, perPage: $limit) {
          media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await fetchAniList<{ Page: { media: AniListAnime[] } }>(query, { limit });
    return data.Page.media.filter(a => a.idMal);
  },

  getPopular: async (limit = 15): Promise<AniListAnime[]> => {
    // Used for "Most Popular" (All Time)
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
  },

  getRecentReleases: async (limit = 20): Promise<AniListAnime[]> => {
    // Used for "Recent Releases"
    const query = `
      query($limit: Int) {
        Page(page: 1, perPage: $limit) {
          media(status: RELEASING, type: ANIME, sort: UPDATED_AT_DESC, isAdult: false) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await fetchAniList<{ Page: { media: AniListAnime[] } }>(query, { limit });
    return data.Page.media.filter(a => a.idMal);
  },

  getTopThisWeek: async (limit = 9): Promise<AniListAnime[]> => {
    // Used for "Top Rated This Season" (Highest score currently airing)
    const query = `
      query($limit: Int) {
        Page(page: 1, perPage: $limit) {
          media(status: RELEASING, type: ANIME, sort: SCORE_DESC, isAdult: false, format: TV) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await fetchAniList<{ Page: { media: AniListAnime[] } }>(query, { limit });
    return data.Page.media.filter(a => a.idMal);
  },

  getAiringSchedule: async (limit = 15): Promise<AniListAnime[]> => {
    // We can query AiringSchedule for things airing roughly within the next 24 hours
    // Or we can just sort by trending releasing anime. Let's get the highest rated releasing anime.
    const query = `
      query($limit: Int) {
        Page(page: 1, perPage: $limit) {
          media(status: RELEASING, type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await fetchAniList<{ Page: { media: AniListAnime[] } }>(query, { limit });
    return data.Page.media.filter(a => a.idMal);
  },

  searchAnime: async (
    search: string,
    filters?: { genre?: string; year?: number; format?: string; sort?: string },
    limit = 20
  ): Promise<AniListAnime[]> => {
    const sort = filters?.sort ? filters.sort : (search ? "SEARCH_MATCH" : "TRENDING_DESC");
    const query = `
      query($search: String, $limit: Int, $genre: String, $seasonYear: Int, $format: MediaFormat) {
        Page(page: 1, perPage: $limit) {
          media(
            search: $search, 
            type: ANIME, 
            genre: $genre,
            seasonYear: $seasonYear,
            format: $format,
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

    const data = await fetchAniList<{ Page: { media: AniListAnime[] } }>(query, variables);
    return data.Page.media.filter(a => a.idMal);
  },

  getAnimeDetails: async (malId: number | string): Promise<AniListAnime & { recommendations?: AniListAnime[], relations?: (AniListAnime & { relationType: string })[] }> => {
    const query = `
      query($idMal: Int) {
        Media(idMal: $idMal, type: ANIME) {
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
    const data = await fetchAniList<{ Media: AniListAnime & { recommendations?: { nodes: { mediaRecommendation: AniListAnime }[] }, relations?: { edges: { relationType: string, node: AniListAnime & { type?: string } }[] } } }>(query, { idMal: Number(malId) });
    
    const media: AniListAnime & { recommendations?: AniListAnime[], relations?: (AniListAnime & { relationType: string })[] } = {
      ...data.Media,
      recommendations: undefined,
      relations: undefined
    };
    
    // Map recommendations
    if (data.Media && data.Media.recommendations && data.Media.recommendations.nodes) {
      media.recommendations = data.Media.recommendations.nodes
        .map((n) => n.mediaRecommendation)
        .filter((r) => r && r.idMal);
    }
    
    // Map relations, filter OTHER/MANGA, sort by startDate
    if (data.Media && data.Media.relations && data.Media.relations.edges) {
      const mappedRelations = data.Media.relations.edges
        .map((edge) => ({
          relationType: edge.relationType,
          ...edge.node
        }))
        .filter((r) => 
          r && 
          r.idMal && 
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
  },

  getAnimeTitlesByIds: async (malIds: number[]): Promise<Record<number, string>> => {
    if (!malIds || malIds.length === 0) return {};
    
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
    
    try {
      const data = await fetchAniList<{ Page: { media: { idMal: number, title: { romaji: string, english: string } }[] } }>(query, { idMal_in: malIds });
      
      const titles: Record<number, string> = {};
      if (data?.Page?.media) {
        data.Page.media.forEach(m => {
          if (m.idMal) {
            titles[m.idMal] = m.title.english || m.title.romaji || `Unknown (${m.idMal})`;
          }
        });
      }
      return titles;
    } catch (e) {
      console.error("Failed to fetch anime titles in batch:", e);
      return {};
    }
  },
};
