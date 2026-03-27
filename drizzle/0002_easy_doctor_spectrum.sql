CREATE TABLE `collection_repos` (
	`collection_id` integer NOT NULL,
	`repo_id` integer NOT NULL,
	PRIMARY KEY(`collection_id`, `repo_id`),
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`repo_id`) REFERENCES `starred_repos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#8b949e' NOT NULL,
	`auto_rules` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `repo_activity` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`repo_id` integer NOT NULL,
	`type` text NOT NULL,
	`summary` text NOT NULL,
	`data` text,
	`external_url` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`repo_id`) REFERENCES `starred_repos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `saved_views` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`filters` text NOT NULL,
	`built_in` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scan_directories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`path` text NOT NULL,
	`recursive` integer DEFAULT true NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`last_scanned_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scan_directories_path_unique` ON `scan_directories` (`path`);--> statement-breakpoint
ALTER TABLE `repo_local_state` ADD `local_tag` text;--> statement-breakpoint
ALTER TABLE `starred_repos` ADD `workflow_stage` text DEFAULT 'watching' NOT NULL;--> statement-breakpoint
ALTER TABLE `starred_repos` ADD `watch_level` text DEFAULT 'releases_only' NOT NULL;