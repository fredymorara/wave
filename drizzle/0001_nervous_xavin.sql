CREATE TABLE "broadcast_reads" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"broadcast_id" text NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_broadcast_read_idx" UNIQUE("user_id","broadcast_id")
);
--> statement-breakpoint
CREATE TABLE "broadcasts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link_url" text,
	"link_label" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link_url" text,
	"link_label" text,
	"actor_name" text,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"id" text PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"visitor_hash" text NOT NULL,
	"anime_id" text,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "watch_history" DROP CONSTRAINT "watch_history_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "watch_history" ALTER COLUMN "progress_seconds" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "watch_history" ADD COLUMN "duration_seconds" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "watch_history" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "watch_history" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "watch_history" ADD COLUMN "language" text DEFAULT 'sub' NOT NULL;--> statement-breakpoint
ALTER TABLE "broadcast_reads" ADD CONSTRAINT "broadcast_reads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_reads" ADD CONSTRAINT "broadcast_reads_broadcast_id_broadcasts_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "public"."broadcasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "broadcast_reads_user_idx" ON "broadcast_reads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notif_user_unread_idx" ON "notifications" USING btree ("user_id","read");--> statement-breakpoint
CREATE INDEX "notif_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "pv_path_idx" ON "page_views" USING btree ("path");--> statement-breakpoint
CREATE INDEX "pv_created_idx" ON "page_views" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pv_anime_idx" ON "page_views" USING btree ("anime_id");--> statement-breakpoint
CREATE INDEX "pv_visitor_idx" ON "page_views" USING btree ("visitor_hash");--> statement-breakpoint
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_anime_ep_idx" ON "comments" USING btree ("anime_id","episode_number");--> statement-breakpoint
CREATE INDEX "comments_user_idx" ON "comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "watch_history_user_updated_idx" ON "watch_history" USING btree ("user_id","updated_at");