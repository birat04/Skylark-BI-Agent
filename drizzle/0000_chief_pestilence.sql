CREATE TABLE "deals" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"stage" text,
	"raw_stage" text,
	"sector" text,
	"raw_sector" text,
	"value" numeric,
	"close_date" date,
	"deal_name" text,
	"is_incomplete" boolean DEFAULT false NOT NULL,
	"raw" jsonb NOT NULL,
	"synced_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"boards_synced" text[],
	"rows_upserted" numeric,
	"rows_skipped" numeric,
	"errors" jsonb
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text,
	"raw_status" text,
	"sector" text,
	"raw_sector" text,
	"start_date" date,
	"due_date" date,
	"deal_name" text,
	"is_incomplete" boolean DEFAULT false NOT NULL,
	"raw" jsonb NOT NULL,
	"synced_at" timestamp with time zone NOT NULL
);
