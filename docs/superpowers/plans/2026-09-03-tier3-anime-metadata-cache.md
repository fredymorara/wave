# Tier 3 Database-Backed Anime Metadata Cache & Failover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a self-hosted Tier 3 metadata cache in Neon DB with rate-limited backend seeding, ongoing ingestion, and frontend failover so Wave Anime remains fully functional even during complete AniList and Jikan blackouts.

**Architecture:** Add an `anime_metadata` table to Neon DB. Create a rate-limited backend batch script in `backend/` that seeds metadata from AniList in 50-item batches. Add Next.js fallback and write-through API endpoints. Update `lib/api/anilist.ts` to seamlessly cascade from AniList (Tier 1) to Jikan (Tier 2) to Neon DB (Tier 3).

**Tech Stack:** Next.js 16 (App Router), Drizzle ORM, Neon Serverless PostgreSQL, AniList GraphQL, Express/TypeScript (`backend/`).

## Global Constraints
- Strictly follow Drizzle `onConflictDoUpdate` batching: use `sql`excluded.column_name`` for all upsert sets.
- Strict adult moderation: never insert or return any anime with `is_adult: true` or genres containing "Hentai" or "Erotica".
- Rate-limit respect: 2.5s delay between AniList GraphQL batch queries (up to 50 IDs per query).
- TypeScript strictness: `pnpm exec tsc --noEmit` must pass with zero errors at each task boundary.

---

### Task 1: Drizzle Schema Definition for `anime_metadata`

**Files:**
- Modify: `db/schema.ts`
- Modify: `backend/src/db/schema.ts`
- Test: `pnpm exec tsc --noEmit`

**Interfaces:**
- Produces: `animeMetadata` table with columns:
  - `mal_id` (integer, primary key)
  - `ani_id` (integer, indexed)
  - `title_english` (text)
  - `title_romaji` (text)
  - `cover_image_large` (text)
  - `cover_image_extra_large` (text)
  - `cover_color` (text)
  - `banner_image` (text)
  - `description` (text)
  - `genres` (text array)
  - `episodes` (integer)
  - `format` (text)
  - `status` (text)
  - `average_score` (integer)
  - `season_year` (integer)
  - `is_adult` (boolean, default false)
  - `updated_at` (timestamp, default now)

- [ ] **Step 1: Add `animeMetadata` to `db/schema.ts`**

In `db/schema.ts`, export `animeMetadata`:
```ts
export const animeMetadata = pgTable("anime_metadata", {
  mal_id: integer("mal_id").primaryKey(),
  ani_id: integer("ani_id"),
  title_english: text("title_english"),
  title_romaji: text("title_romaji"),
  cover_image_large: text("cover_image_large"),
  cover_image_extra_large: text("cover_image_extra_large"),
  cover_color: text("cover_color"),
  banner_image: text("banner_image"),
  description: text("description"),
  genres: text("genres").array(),
  episodes: integer("episodes"),
  format: text("format"),
  status: text("status"),
  average_score: integer("average_score"),
  season_year: integer("season_year"),
  is_adult: boolean("is_adult").default(false).notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("anime_meta_ani_id_idx").on(table.ani_id),
  index("anime_meta_status_score_idx").on(table.status, table.average_score),
  index("anime_meta_updated_idx").on(table.updated_at),
]);
```

- [ ] **Step 2: Sync `animeMetadata` to `backend/src/db/schema.ts`**

Add the identical `animeMetadata` definition to `backend/src/db/schema.ts` so the Render backend has typed access to the table.

- [ ] **Step 3: Run Drizzle Kit to generate migration and check types**

Run: `pnpm exec drizzle-kit generate` and `pnpm exec tsc --noEmit`
Expected: Migration generated, clean TypeScript exit code 0.

- [ ] **Step 4: Commit**

```bash
git add db/schema.ts backend/src/db/schema.ts drizzle/
git commit -m "feat(db): add anime_metadata schema for Tier 3 local cache"
```

---

### Task 2: Next.js DB Fallback & Write-Through API Endpoints

**Files:**
- Create: `app/api/anime/db-fallback/route.ts`
- Create: `app/api/anime/cache-metadata/route.ts`
- Modify: `lib/db/index.ts` (if needed for imports)

**Interfaces:**
- `GET /api/anime/db-fallback`:
  - Query params: `action` ("details" | "popular" | "trending" | "search"), `id` (MAL or Ani ID), `q` (search string), `limit` (number).
  - Returns: `{ media: AniListAnime[] }` or `{ media: AniListAnime }`.
- `POST /api/anime/cache-metadata`:
  - Body: `{ anime: AniListAnime }` or `{ animeList: AniListAnime[] }`.
  - Action: Batch upserts into `animeMetadata` using Drizzle with adult content filtered out.

- [ ] **Step 1: Create `app/api/anime/db-fallback/route.ts`**

Implement `GET` handler:
- Supports `action="details"`: finds by `mal_id` or `ani_id` where `is_adult = false`.
- Supports `action="popular"`: selects ordered by `average_score desc nulls last` limit N.
- Supports `action="trending"`: selects ordered by `updated_at desc` limit N.
- Supports `action="search"`: filters by ILIKE `%q%` on `title_english` or `title_romaji`.
- Maps database rows back to the standard `AniListAnime` interface.

- [ ] **Step 2: Create `app/api/anime/cache-metadata/route.ts`**

Implement `POST` handler:
- Accepts single `anime` or array `animeList`.
- Validates each item: skips any item if `isAdult === true` or genres contain "Hentai" / "Erotica".
- Upserts records using `db.insert(animeMetadata).values(...).onConflictDoUpdate({ target: animeMetadata.mal_id, set: { ...sql'excluded...' } })`.
- Returns `{ success: true, count: N }`.

- [ ] **Step 3: Verify API endpoints with a curl or test fetch**

Test with `pnpm exec tsx` to test both endpoints.
Expected: Returns 200 OK with correct payload format.

- [ ] **Step 4: Commit**

```bash
git add app/api/anime/db-fallback/route.ts app/api/anime/cache-metadata/route.ts
git commit -m "feat(api): add db-fallback and cache-metadata API endpoints"
```

---

### Task 3: Backend Rate-Limited Batch Seeding Script

**Files:**
- Create: `backend/src/scripts/seedMetadata.ts`
- Modify: `backend/package.json`

**Interfaces:**
- Consumes: `anime_episodes` table from Neon DB, AniList GraphQL API (`idMal_in: [Int]`).
- Produces: Populates `anime_metadata` with all known catalog shows.

- [ ] **Step 1: Write `backend/src/scripts/seedMetadata.ts`**

Script logic:
1. Query distinct integer MAL IDs from `anime_episodes` where ID does not start with `ani_`.
2. Filter out IDs already present in `anime_metadata`.
3. Chunk into batches of 50 IDs.
4. For each batch:
   - Call AniList GraphQL query with `$ids: [Int]` and `isAdult: false, genre_not_in: ["Hentai"]`.
   - Map response into `animeMetadata` insert values.
   - Run batch upsert using Drizzle ORM.
   - Log progress: `[Seed] Batch X/Y: Synced 50 shows (Total: Z)...`.
   - Sleep 2500ms between batches to stay safe under AniList's 90 req/min limit.
5. Exit cleanly when all batches complete.

- [ ] **Step 2: Add npm script to `backend/package.json`**

Add `"seed:metadata": "tsx src/scripts/seedMetadata.ts"`.

- [ ] **Step 3: Test run script with a dry run or small batch**

Verify that 5-10 records are fetched and upserted cleanly into Neon DB.

- [ ] **Step 4: Commit**

```bash
git add backend/src/scripts/seedMetadata.ts backend/package.json
git commit -m "feat(backend): add rate-limited AniList metadata seeding script"
```

---

### Task 4: Backend Anikoto Sync Integration

**Files:**
- Modify: `backend/src/cron/sync.ts`

**Interfaces:**
- Consumes: Anikoto `recent-anime` sync payload.
- Produces: Enqueues missing show IDs to fetch and store metadata in `anime_metadata`.

- [ ] **Step 1: Update `backend/src/cron/sync.ts`**

After `animeEpisodes` upsert in `runSyncJob()`:
1. Collect newly updated MAL IDs.
2. Check if any are missing from `anime_metadata`.
3. If missing IDs exist, fetch their metadata from AniList (or Jikan fallback) in small batches and insert into `anime_metadata`.
4. Ensure sleep delays are respected.

- [ ] **Step 2: Verify compilation of backend**

Run: `cd backend && pnpm build` (or `pnpm exec tsc --noEmit` in backend).
Expected: Clean compilation with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/cron/sync.ts
git commit -m "feat(backend): enrich anime_metadata during scheduled Anikoto sync"
```

---

### Task 5: 3-Tier Failover Integration in `lib/api/anilist.ts`

**Files:**
- Modify: `lib/api/anilist.ts`
- Test: `pnpm exec tsc --noEmit`

**Interfaces:**
- Fallback cascade in every `anilistApi` method:
  1. Try AniList GraphQL (Tier 1)
  2. Fallback to `jikanApi` (Tier 2)
  3. Fallback to `/api/anime/db-fallback` (Tier 3)
- Write-through hook:
  - On successful Tier 1 or Tier 2 fetch of anime details or search lists, fire a non-blocking `fetch('/api/anime/cache-metadata', ...)` to keep Neon DB fresh.

- [ ] **Step 1: Add DB fallback helper in `lib/api/anilist.ts`**

```ts
async function fetchDbFallback<T>(params: Record<string, string | number>): Promise<T | null> {
  try {
    const url = new URL("/api/anime/db-fallback", window.location.origin);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    return await res.json() as T;
  } catch (e) {
    console.warn("[DB Fallback] Failed:", e);
    return null;
  }
}
```

- [ ] **Step 2: Update all methods in `anilistApi` to cascade to Tier 3**

Update `getTrending`, `getPopular`, `getTopThisWeek`, `searchAnime`, `searchAnimePaginated`, and `getAnimeDetails` so that when Jikan also fails or returns empty, `fetchDbFallback` is queried.

- [ ] **Step 3: Add asynchronous write-through cache trigger**

In `getAnimeDetails`, after successfully resolving from AniList or Jikan, dispatch non-blocking cache update:
```ts
if (typeof window !== "undefined") {
  fetch("/api/anime/cache-metadata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anime: media }),
  }).catch(() => {});
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/api/anilist.ts
git commit -m "feat(api): integrate Tier 3 database failover and write-through caching"
```

---

### Task 6: Verification & End-to-End Testing

**Files:**
- Test: `pnpm exec tsc --noEmit`
- Test: `pnpm run build`
- Verify with browser subagent

- [ ] **Step 1: TypeScript validation**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2: Production build validation**

Run: `pnpm run build`
Expected: Build passes with code 0.

- [ ] **Step 3: Browser blackout simulation test**

Simulate AniList + Jikan failure by temporarily tripping circuit breaker and blocking external queries.
Verify:
- Homepage displays popular/trending anime from Neon DB.
- Search `/search?q=...` returns results from Neon DB.
- Show details `/anime/[id]` displays cover, description, and episode count.
- Adult/hentai filter remains 100% active.

- [ ] **Step 4: Commit and finalize walkthrough**

```bash
git add walkthrough.md
git commit -m "docs: finalize walkthrough for Tier 3 database metadata cache"
```
