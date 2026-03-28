CREATE TABLE `db_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`icon` text NOT NULL,
	`color` text NOT NULL,
	`position` integer NOT NULL,
	`auto_rules` text
);
--> statement-breakpoint
CREATE TABLE `repo_categories` (
	`repo_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	`is_auto` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`repo_id`) REFERENCES `starred_repos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `db_categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `repo_categories_repo_idx` ON `repo_categories` (`repo_id`);--> statement-breakpoint
CREATE TABLE `workflow_stages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`icon` text NOT NULL,
	`color` text NOT NULL,
	`position` integer NOT NULL,
	`deletable` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE `starred_repos` ADD `workflow_stage_id` integer REFERENCES workflow_stages(id);