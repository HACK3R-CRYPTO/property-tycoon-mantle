ALTER TABLE "buildings" ADD COLUMN "internal_gold" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "internal_elixir" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "internal_gold_capacity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "internal_elixir_capacity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "last_collected_at" timestamp DEFAULT now() NOT NULL;