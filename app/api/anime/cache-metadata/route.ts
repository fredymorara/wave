import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { animeMetadata } from "@/db/schema";
import { sql } from "drizzle-orm";
import { isSafeAnime, type AniListAnime } from "@/lib/api/anilist";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawList: AniListAnime[] = Array.isArray(body.animeList)
      ? body.animeList
      : body.anime
      ? [body.anime]
      : [];

    if (rawList.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Filter strictly for safe, non-adult anime with valid MAL ID
    const validItems = rawList.filter((item) => {
      if (!item || !isSafeAnime(item)) return false;
      const id = item.idMal || item.id;
      return typeof id === "number" && id > 0 && !Number.isNaN(id);
    });

    if (validItems.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const now = new Date();
    const records = validItems.map((item) => {
      const malId = item.idMal || item.id;
      const aniId = item.id && item.id !== malId ? item.id : null;

      return {
        mal_id: malId,
        ani_id: aniId,
        title_english: item.title?.english || null,
        title_romaji: item.title?.romaji || null,
        cover_image_large: item.coverImage?.large || null,
        cover_image_extra_large: item.coverImage?.extraLarge || null,
        cover_color: item.coverImage?.color || null,
        banner_image: item.bannerImage || null,
        description: item.description || null,
        genres: Array.isArray(item.genres) ? item.genres : [],
        episodes: item.episodes || null,
        format: item.format || null,
        status: item.status || null,
        average_score: item.averageScore || null,
        season_year: item.seasonYear || null,
        is_adult: false,
        updated_at: now,
      };
    });

    // Deduplicate by mal_id before upsert
    const uniqueMap = new Map<number, (typeof records)[0]>();
    for (const rec of records) {
      uniqueMap.set(rec.mal_id, rec);
    }
    const dedupedRecords = Array.from(uniqueMap.values());

    // Drizzle onConflictDoUpdate batching rule applied:
    // Always use sql`excluded.column_name`
    await db
      .insert(animeMetadata)
      .values(dedupedRecords)
      .onConflictDoUpdate({
        target: animeMetadata.mal_id,
        set: {
          ani_id: sql`coalesce(excluded.ani_id, anime_metadata.ani_id)`,
          title_english: sql`coalesce(excluded.title_english, anime_metadata.title_english)`,
          title_romaji: sql`coalesce(excluded.title_romaji, anime_metadata.title_romaji)`,
          cover_image_large: sql`coalesce(excluded.cover_image_large, anime_metadata.cover_image_large)`,
          cover_image_extra_large: sql`coalesce(excluded.cover_image_extra_large, anime_metadata.cover_image_extra_large)`,
          cover_color: sql`coalesce(excluded.cover_color, anime_metadata.cover_color)`,
          banner_image: sql`coalesce(excluded.banner_image, anime_metadata.banner_image)`,
          description: sql`coalesce(excluded.description, anime_metadata.description)`,
          genres: sql`coalesce(excluded.genres, anime_metadata.genres)`,
          episodes: sql`coalesce(excluded.episodes, anime_metadata.episodes)`,
          format: sql`coalesce(excluded.format, anime_metadata.format)`,
          status: sql`coalesce(excluded.status, anime_metadata.status)`,
          average_score: sql`coalesce(excluded.average_score, anime_metadata.average_score)`,
          season_year: sql`coalesce(excluded.season_year, anime_metadata.season_year)`,
          updated_at: sql`excluded.updated_at`,
        },
      });

    return NextResponse.json({ success: true, count: dedupedRecords.length });
  } catch (error) {
    console.error("[Cache Metadata API Error]:", error);
    return NextResponse.json({ error: "Failed to cache metadata" }, { status: 500 });
  }
}
