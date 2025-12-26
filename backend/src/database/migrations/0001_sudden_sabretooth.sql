CREATE TABLE IF NOT EXISTS "army" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"village_id" uuid NOT NULL,
	"troop_type" varchar(50) NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "training_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"village_id" uuid NOT NULL,
	"troop_type" varchar(50) NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completes_at" timestamp NOT NULL,
	"cost" integer NOT NULL,
	"queue_position" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "army" ADD CONSTRAINT "army_village_id_villages_id_fk" FOREIGN KEY ("village_id") REFERENCES "villages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "training_queue" ADD CONSTRAINT "training_queue_village_id_villages_id_fk" FOREIGN KEY ("village_id") REFERENCES "villages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
