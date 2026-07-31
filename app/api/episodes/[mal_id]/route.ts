import { NextResponse } from 'next/server';
import { db } from '@/db';
import { animeEpisodes } from '@/db/schema';
import { eq, or } from 'drizzle-orm';

export const revalidate = 3600; // Cache for 1 hour

export async function GET(
  request: Request,
  context: { params: Promise<{ mal_id: string }> }
) {
  const { mal_id } = await context.params;
  
  try {
    // Try both the raw ID (MAL) and the ani_ prefixed version (AniList)
    const result = await db.select().from(animeEpisodes).where(
      or(
        eq(animeEpisodes.anime_id, mal_id),
        eq(animeEpisodes.anime_id, `ani_${mal_id}`)
      )
    );
    
    if (result.length > 0) {
      return NextResponse.json(result[0]);
    }

    // Not found in database
    return NextResponse.json({
      is_sub: null,
      is_dub: null,
      error: "Not found in Anikoto database"
    }, { status: 404 });

  } catch (error) {
    console.error("API Error reading database:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
