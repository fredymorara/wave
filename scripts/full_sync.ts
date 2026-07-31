import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../db/index.js';
import { animeEpisodes } from '../db/schema.js';
import { sql } from 'drizzle-orm';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type AnikotoItem = {
  mal_id?: number | string;
  is_sub?: number;
  is_dub?: number;
};

async function runFullSync() {
  console.log(`[${new Date().toISOString()}] Starting FULL Anikoto sync...`);
  let syncedCount = 0;
  let page = 1;

  try {
    while (true) {
      console.log(`Fetching page ${page} of recent-anime...`);
      const response = await fetch(`https://anikotoapi.site/recent-anime?page=${page}&per_page=100`);
      
      if (!response.ok) {
        console.error(`Failed to fetch page ${page}: ${response.statusText}`);
        break; // Stop on error, we don't want to infinite loop if API goes down
      }

      const data = await response.json();
      const items = data.data || [];

      if (items.length === 0) {
        console.log(`Page ${page} is empty. Reached the end of the Anikoto database.`);
        break;
      }

      // Extract and deduplicate records by anime_id
      const recordsMap = new Map();
      items.forEach((item: AnikotoItem) => {
        const animeId = String(item.mal_id);
        if (animeId && animeId !== 'undefined') {
          recordsMap.set(animeId, {
            anime_id: animeId,
            is_sub: item.is_sub || 0,
            is_dub: item.is_dub || 0,
            updated_at: new Date(),
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
