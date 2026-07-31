# Neon Database Migration & Recovery Guide

If your Neon database runs out of free Compute (CU) hours or gets suspended, you **do not** need to worry about manually exporting or migrating your data. Because our database is entirely mirrored from the Anikoto API, you can easily spin up a brand new database and completely rebuild it from scratch.

Follow these simple steps whenever you need to migrate to a new Neon database project.

## Step 1: Create a New Neon Project
1. Go to the [Neon Console](https://console.neon.tech/) and create a brand new free project.
2. Copy the new **Connection String** (`DATABASE_URL`).

## Step 2: Update Your Environment Variables
You need to update the connection string in three different places so your systems know to talk to the new database:

1. **Locally:** Open `.env.local` on your computer and paste the new URL.
2. **GitHub Actions:** Go to your GitHub repository -> Settings -> Secrets and variables -> Actions. Click the pencil icon next to `DATABASE_URL` and update it.
3. **Vercel:** Go to your Vercel project settings -> Environment Variables, and update the `DATABASE_URL` there as well. (Make sure to trigger a redeploy so Vercel picks it up!).

## Step 3: Build the Tables
Open your terminal in this project folder and push your schema to the new, empty database.

> [!WARNING]
> Always use `pnpm exec drizzle-kit` (not `pnpm dlx drizzle-kit`) to avoid local database driver dependency errors.

Run the following command:
```bash
pnpm exec drizzle-kit push
```
This will instantly create all the necessary tables (like `anime_episodes`) in your new database.

## Step 4: Run the Full Sync
Finally, you need to populate the database with data. We have a dedicated script that fetches the entire Anikoto catalog (~9,000+ anime) and inserts it into your database.

Run this command locally on your machine:
```bash
pnpm exec tsx --env-file=.env.local scripts/full_sync.ts
```

> [!NOTE]
> This script is designed to run slowly (with a 5-second delay between pages) so you do not get IP banned by the Anikoto API. It will take roughly 15 to 25 minutes to complete. Just leave the terminal window open and let it run until it says "FULL Sync complete!".

That's it! Your new database is now perfectly synced and the GitHub Action will automatically resume keeping it updated every 14 minutes.
