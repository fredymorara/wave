CREATE TABLE "anime_metadata" (
	"mal_id" integer PRIMARY KEY NOT NULL,
	"ani_id" integer,
	"title_english" text,
	"title_romaji" text,
	"cover_image_large" text,
	"cover_image_extra_large" text,
	"cover_color" text,
	"banner_image" text,
	"description" text,
	"genres" text[],
	"episodes" integer,
	"format" text,
	"status" text,
	"average_score" integer,
	"season_year" integer,
	"is_adult" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "anime_meta_ani_id_idx" ON "anime_metadata" USING btree ("ani_id");--> statement-breakpoint
CREATE INDEX "anime_meta_status_score_idx" ON "anime_metadata" USING btree ("status","average_score");--> statement-breakpoint
CREATE INDEX "anime_meta_updated_idx" ON "anime_metadata" USING btree ("updated_at");