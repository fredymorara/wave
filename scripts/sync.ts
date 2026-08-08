import { config } from 'dotenv';
config({ path: '.env.local' });
config(); // also check standard .env if present
import { animeEpisodes } from '../db/schema.js';
import { sql } from 'drizzle-orm';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runSyncJob() {
  const { db } = await import('../db/index.js');
  console.log(`[${new Date().toISOString()}] Starting Anikoto sync from GitHub Actions...`);
  let syncedCount = 0;

  try {
    const MAX_PAGES = 10;

    for (let page = 1; page <= MAX_PAGES; page++) {
      console.log(`Fetching page ${page} of recent-anime...`);
      const response = await fetch(`https://anikotoapi.site/recent-anime?page=${page}&per_page=100`);
      
      if (!response.ok) {
        console.error(`Failed to fetch page ${page}: ${response.statusText}`);
        break;
      }

      const data = await response.json();
      const items = data.data || [];

      if (items.length === 0) {
        console.log(`Page ${page} is empty. Stopping sync.`);
        break;
      }

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
        // Drizzle onConflictDoUpdate batching rule applied:
        // Use sql`excluded.column_name` to reference the new values being inserted.
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

      // Add a 5 second delay between requests to be gentle on Anikoto API
      if (page < MAX_PAGES) {
        await delay(5000);
      }
    }

    console.log(`[${new Date().toISOString()}] Sync complete! Synced ${syncedCount} recent anime.`);
    process.exit(0);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Sync failed:`, error);
    process.exit(1);
  }
}

runSyncJob();
