import { config } from 'dotenv';
config({ path: '.env.local' });
config();
import { animeEpisodes } from '../db/schema.js';
import { sql } from 'drizzle-orm';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type AnikotoItem = {
  id?: number | string;
  mal_id?: number | string | null;
  ani_id?: number | string | null;
  is_sub?: number | null;
  is_dub?: number | null;
};

const isValidId = (id: unknown): boolean => {
  if (id === null || id === undefined) return false;
  const s = String(id).trim();
  return Boolean(s && s !== '0' && s !== 'null' && s !== 'undefined' && s !== 'NaN');
};

async function runFullSync() {
  const { db } = await import('../db/index.js');
  console.log(`[${new Date().toISOString()}] Starting FULL Anikoto sync...`);
  let syncedCount = 0;
  let page = 1;

  try {
    let retries = 0;
    while (true) {
      console.log(`Fetching page ${page} of recent-anime...`);
      let response: Response | null = null;

      try {
        response = await fetch(`https://anikotoapi.site/recent-anime?page=${page}&per_page=100`);
      } catch (fetchErr) {
        console.error(`Network error on page ${page}:`, fetchErr);
      }
      
      if (!response || !response.ok) {
        if (response && response.status === 404) {
          console.log(`Page ${page} returned 404. Reached the end of the Anikoto database.`);
          break;
        }

        retries++;
        if (retries <= 3) {
          const waitTime = retries * 10000;
          console.warn(`Fetch for page ${page} failed (${response?.status || 'network'}). Retrying attempt ${retries}/3 in ${waitTime / 1000}s...`);
          await delay(waitTime);
          continue;
        } else {
          console.error(`Failed to fetch page ${page} after 3 retries. Stopping sync.`);
          break;
        }
      }

      retries = 0;
      const data = await response.json();
      const items = data.data || [];

      if (items.length === 0) {
        console.log(`Page ${page} is empty. Reached the end of the Anikoto database.`);
        break;
      }

      // Extract and deduplicate records by unique anime_id
      const recordsMap = new Map<string, { anime_id: string; is_sub: number; is_dub: number; updated_at: Date }>();
      const now = new Date();

      items.forEach((item: AnikotoItem) => {
        const subCount = Number(item.is_sub) || 0;
        const dubCount = Number(item.is_dub) || 0;

        // 1. Map under standard MAL ID if valid
        if (isValidId(item.mal_id)) {
          const malIdStr = String(item.mal_id).trim();
          recordsMap.set(malIdStr, {
            anime_id: malIdStr,
            is_sub: subCount,
            is_dub: dubCount,
            updated_at: now,
          });
        }

        // 2. Map under ani_ prefixed AniList ID if valid
        if (isValidId(item.ani_id)) {
          const aniIdStr = `ani_${String(item.ani_id).trim()}`;
          recordsMap.set(aniIdStr, {
            anime_id: aniIdStr,
            is_sub: subCount,
            is_dub: dubCount,
            updated_at: now,
          });
        }
      });
      const records = Array.from(recordsMap.values());

      if (records.length > 0) {
        await db.insert(animeEpisodes)
          .values(records)
          .onConflictDoUpdate({
            target: animeEpisodes.anime_id,
            set: {
              is_sub: sql`excluded.is_sub`,
              is_dub: sql`excluded.is_dub`,
              updated_at: sql`excluded.updated_at`
            }
          });
        syncedCount += records.length;
      }

      console.log(`Successfully synced page ${page}. Total synced so far: ${syncedCount}`);
      
      page++;
      // Be gentle on Anikoto API
      await delay(5000);
    }

    console.log(`[${new Date().toISOString()}] FULL Sync complete! Synced a total of ${syncedCount} anime.`);
    process.exit(0);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] FULL Sync failed:`, error);
    process.exit(1);
  }
}

runFullSync();
