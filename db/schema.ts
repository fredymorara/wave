import { pgTable, integer, timestamp, text, boolean, unique, index, real } from "drizzle-orm/pg-core";

export const animeEpisodes = pgTable("anime_episodes", {
  anime_id: text("anime_id").primaryKey(), // MAL ID (e.g. "12345") or AniList ID (e.g. "ani_12345")
  is_sub: integer("is_sub").default(0),
  is_dub: integer("is_dub").default(0),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(()=> user.id)
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(()=> user.id),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at')
});

export const watchlist = pgTable("watchlist", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  animeId: text("anime_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => {
  return [
    unique("user_anime_watchlist_idx").on(table.userId, table.animeId)
  ];
});

export const watchHistory = pgTable("watch_history", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  animeId: text("anime_id").notNull(),
  episodeNumber: integer("episode_number").notNull(),
  progressSeconds: real("progress_seconds").notNull().default(0),
  durationSeconds: real("duration_seconds").notNull().default(0),
  title: text("title"),            // denormalized for fast "Continue Watching" rendering
  imageUrl: text("image_url"),     // denormalized cover image URL
  language: text("language").notNull().default("sub"), // "sub" | "dub"
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return [
    unique("user_anime_history_idx").on(table.userId, table.animeId),
    index("watch_history_user_updated_idx").on(table.userId, table.updatedAt),
  ];
});

export const comments = pgTable("comments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  animeId: text("anime_id").notNull(),
  episodeNumber: integer("episode_number"), 
  content: text("content").notNull(),
  parentId: text("parent_id"), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return [
    index("comments_anime_ep_idx").on(table.animeId, table.episodeNumber),
    index("comments_user_idx").on(table.userId)
  ];
});

// Per-user notifications (comment replies, etc.)
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  type: text("type").notNull(),            // "comment_reply"
  title: text("title").notNull(),
  message: text("message").notNull(),
  linkUrl: text("link_url"),               // "/watch/12345/3"
  linkLabel: text("link_label"),           // "Naruto Ep 3"
  actorName: text("actor_name"),           // "John" (denormalized)
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return [
    index("notif_user_unread_idx").on(table.userId, table.read),
    index("notif_user_created_idx").on(table.userId, table.createdAt),
  ];
});

// Admin broadcast messages (stored once, not per-user)
export const broadcasts = pgTable("broadcasts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  linkUrl: text("link_url"),
  linkLabel: text("link_label"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tracks which broadcasts a user has read (lazy — rows only for read ones)
export const broadcastReads = pgTable("broadcast_reads", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  broadcastId: text("broadcast_id").notNull().references(() => broadcasts.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at").defaultNow().notNull(),
}, (table) => {
  return [
    unique("user_broadcast_read_idx").on(table.userId, table.broadcastId),
    index("broadcast_reads_user_idx").on(table.userId),
  ];
});

// Analytics: Page Views
export const pageViews = pgTable("page_views", {
  id: text("id").primaryKey(),
  path: text("path").notNull(),
  visitorHash: text("visitor_hash").notNull(),
  animeId: text("anime_id"),
  userId: text("user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return [
    index("pv_path_idx").on(table.path),
    index("pv_created_idx").on(table.createdAt),
    index("pv_anime_idx").on(table.animeId),
    index("pv_visitor_idx").on(table.visitorHash),
  ];
});

// Tier 3 Cache: Full anime catalog metadata
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

