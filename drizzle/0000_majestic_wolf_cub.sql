CREATE TABLE `participant_feedback` (
	`trip_id` text NOT NULL,
	`person_id` text NOT NULL,
	`seen_revision` integer,
	`checkin` text,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`trip_id`, `person_id`)
);
--> statement-breakpoint
CREATE TABLE `shared_trips` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`revision` integer NOT NULL,
	`updated_at` text NOT NULL
);
