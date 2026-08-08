# Wave Anime — Neon Database Migration & Quota Recovery Guide

This guide provides step-by-step instructions for migrating Wave Anime to a fresh **Neon Postgres** project when approaching or exhausting monthly Compute Unit (CU) limits (100 CU-hours on the Neon Free Tier).

---

## 📋 Overview

Neon's Free Tier includes **100 CU-hours** per calendar month. If usage reaches the quota limit, queries may be throttled or blocked until the cycle resets. 

Because Wave Anime uses a decoupled cache architecture (`anime_episodes` can be rebuilt from scratch at any time via sync scripts), migrating to a fresh Neon project takes **under 3 minutes**.

---

## 🚀 Step-by-Step Migration

### Step 1: Create a New Neon Project
1. Log into the [Neon Console](https://console.neon.tech/).
2. Click **New Project**.
3. Set a project name (e.g., `wave-anime-db-2`).
4. Select the region closest to your Vercel / Render deployment (e.g., `AWS us-east-1` or `eu-central-1`).
5. Copy the generated **Postgres Connection String** (with `?sslmode=require` / Pooled connection enabled).
   ```env
   DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-sample-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
   ```

---

### Step 2: Push Database Schema
Ensure your local `.env.local` contains the **new** `DATABASE_URL`:

```env
DATABASE_URL="postgresql://neondb_owner:NEW_PASSWORD@NEW_HOST/neondb?sslmode=require"
```

Push all project tables, indices, and constraints to the new database using Drizzle Kit:

```bash
pnpm exec drizzle-kit push
```
*(Alternatively with npx: `npx drizzle-kit push`)*

This creates all required tables:
- `anime_episodes` (Cache table with dual MAL + AniList indexing)
- `user`, `session`, `account`, `verification` (Authentication)
- `watchlist`, `watch_history` (User state)
- `comments`, `notifications`, `broadcasts`, `broadcast_reads` (Social & alerts)
- `page_views` (Analytics)

---

### Step 3: Populate Episode Cache
Re-sync the complete Anikoto anime catalog (~13,500+ records) into the new database.

Run the local full sync script:
```bash
pnpm exec tsx scripts/full_sync.ts
```

> [!NOTE]
> The full sync script runs with automatic retries, backoff handling, and batch deduplication. It will cleanly exit with status code `0` once finished.

---

### Step 4: (Optional) Migrate User Data from Old Database
If you need to transfer user accounts, watch history, or comments from the old Neon database:

#### Method A: Direct SQL Dump & Restore (Recommended for full data)
Export from the old database and import to the new database using standard PostgreSQL CLI tools:

```bash
# 1. Export user-specific tables from old DB
pg_dump "OLD_DATABASE_URL" -t "user" -t "session" -t "account" -t "watchlist" -t "watch_history" -t "comments" -t "notifications" -t "broadcasts" --data-only > wave_user_data.sql

# 2. Import into new DB
psql "NEW_DATABASE_URL" < wave_user_data.sql
```

---

### Step 5: Update Deployment Environment Variables
Update the `DATABASE_URL` in all active hosting environments:

1. **Vercel (Frontend & API Routes)**:
   - Go to **Vercel Dashboard** → Select **Wave Anime** → **Settings** → **Environment Variables**.
   - Edit `DATABASE_URL` with the new connection string.
   - Trigger a **Redeploy** (Deployments → Redeploy latest commit).

2. **Render (Sync & Express Backend)**:
   - Go to **Render Dashboard** → Select `wave-anime-backend` → **Environment**.
   - Update `DATABASE_URL`.
   - Click **Save Changes** (Render will automatically redeploy).

3. **GitHub Actions (Automated Cron Sync)**:
   - Go to **GitHub Repository** → **Settings** → **Secrets and variables** → **Actions**.
   - Update `DATABASE_URL` secret.

---

## 🔍 Verification & Health Check

After completing the migration, verify that everything is operating normally:

1. **Check Database Stats**:
   Run the quick verification command:
   ```bash
   pnpm exec tsx -e "import { db } from './db/index.js'; import { animeEpisodes } from './db/schema.js'; import { count } from 'drizzle-orm'; db.select({ count: count() }).from(animeEpisodes).then(res => console.log('Episodes in new DB:', res[0].count));"
   ```

2. **Check App Streaming & Episode Gating**:
   - Open any anime page (e.g. `http://localhost:3000/anime/20` or live site).
   - Check episode sub/dub counts and stream player server switching.

---

## 💡 Best Practices to Conserve Neon Compute Units

1. **Keep Auto-Suspend Low**: In Neon Project Settings, keep compute auto-suspend set to **5 minutes** (default).
2. **Batch Ingestions**: Always perform database writes in batches of 100+ records rather than individual queries.
3. **Use Render for Background Tasks**: Keep long-running sync scripts off Vercel serverless functions to avoid rapid cold-start connection churn.
