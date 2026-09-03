import { config } from 'dotenv';
config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema.js';

const OLD_DB_URL = process.env.OLD_DATABASE_URL;
const NEW_DB_URL = process.env.DATABASE_URL;

if (!OLD_DB_URL || !NEW_DB_URL) {
  console.error("Both OLD_DATABASE_URL and DATABASE_URL must be defined in .env.local!");
  process.exit(1);
}

async function migrateAllUserData() {
  console.log("=== Starting User Data Migration from Old DB to New DB ===");

  const oldSql = neon(OLD_DB_URL!);
  const oldDb = drizzle(oldSql, { schema });

  const newSql = neon(NEW_DB_URL!);
  const newDb = drizzle(newSql, { schema });

  try {
    // 1. Migrate Users
    const users = await oldDb.select().from(schema.user);
    if (users.length > 0) {
      await newDb.insert(schema.user).values(users).onConflictDoNothing();
      console.log(`✓ Migrated ${users.length} users.`);
    }

    // 2. Migrate Accounts
    const accounts = await oldDb.select().from(schema.account);
    if (accounts.length > 0) {
      await newDb.insert(schema.account).values(accounts).onConflictDoNothing();
      console.log(`✓ Migrated ${accounts.length} accounts.`);
    }

    // 3. Migrate Sessions
    const sessions = await oldDb.select().from(schema.session);
    if (sessions.length > 0) {
      await newDb.insert(schema.session).values(sessions).onConflictDoNothing();
      console.log(`✓ Migrated ${sessions.length} sessions.`);
    }

    // 4. Migrate Verifications
    const verifications = await oldDb.select().from(schema.verification);
    if (verifications.length > 0) {
      await newDb.insert(schema.verification).values(verifications).onConflictDoNothing();
      console.log(`✓ Migrated ${verifications.length} verifications.`);
    }

    // 5. Migrate Watchlist
    const watchlists = await oldDb.select().from(schema.watchlist);
    if (watchlists.length > 0) {
      await newDb.insert(schema.watchlist).values(watchlists).onConflictDoNothing();
      console.log(`✓ Migrated ${watchlists.length} watchlist entries.`);
    }

    // 6. Migrate Watch History
    const history = await oldDb.select().from(schema.watchHistory);
    if (history.length > 0) {
      await newDb.insert(schema.watchHistory).values(history).onConflictDoNothing();
      console.log(`✓ Migrated ${history.length} watch history entries.`);
    }

    // 7. Migrate Broadcasts
    const broadcasts = await oldDb.select().from(schema.broadcasts);
    if (broadcasts.length > 0) {
      await newDb.insert(schema.broadcasts).values(broadcasts).onConflictDoNothing();
      console.log(`✓ Migrated ${broadcasts.length} broadcasts.`);
    }

    // 8. Migrate Broadcast Reads
    const broadcastReads = await oldDb.select().from(schema.broadcastReads);
    if (broadcastReads.length > 0) {
      await newDb.insert(schema.broadcastReads).values(broadcastReads).onConflictDoNothing();
      console.log(`✓ Migrated ${broadcastReads.length} broadcast reads.`);
    }

    // 9. Migrate Comments
    const comments = await oldDb.select().from(schema.comments);
    if (comments.length > 0) {
      await newDb.insert(schema.comments).values(comments).onConflictDoNothing();
      console.log(`✓ Migrated ${comments.length} comments.`);
    }

    // 10. Migrate Notifications
    const notifications = await oldDb.select().from(schema.notifications);
    if (notifications.length > 0) {
      await newDb.insert(schema.notifications).values(notifications).onConflictDoNothing();
      console.log(`✓ Migrated ${notifications.length} notifications.`);
    }

    // 11. Migrate Page Views
    const pageViews = await oldDb.select().from(schema.pageViews);
    if (pageViews.length > 0) {
      await newDb.insert(schema.pageViews).values(pageViews).onConflictDoNothing();
      console.log(`✓ Migrated ${pageViews.length} page views.`);
    }

    console.log("=== All user and app data successfully restored to new DB! ===");
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
}

migrateAllUserData();
