import { config } from 'dotenv';
config({ path: '.env.local' }); // Fallback if run locally
import { db } from '../db/index.js';
import { animeEpisodes } from '../db/schema.js';
import { sql } from 'drizzle-orm';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runSyncJob() {
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

      // Extract records
      const records = items.map((item: any) => ({
        anime_id: String(item.mal_id),
        is_sub: item.is_sub || 0,
        is_dub: item.is_dub || 0,
        updated_at: new Date(),
      })).filter((r: any) => r.anime_id && r.anime_id !== 'undefined');

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
