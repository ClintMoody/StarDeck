CREATE TABLE `compatibility_checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`repo_id` integer NOT NULL,
	`runtime` text NOT NULL,
	`required_version` text,
	`local_version` text,
	`compatible` integer,
	`checked_at` text,
	FOREIGN KEY (`repo_id`) REFERENCES `starred_repos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `github_list_repos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`list_id` integer NOT NULL,
	`repo_id` integer NOT NULL,
	FOREIGN KEY (`list_id`) REFERENCES `github_lists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`repo_id`) REFERENCES `starred_repos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `github_lists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`github_id` integer,
	`name` text NOT NULL,
	`description` text,
	`synced_at` text
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`repo_id` integer,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text,
	`channels_sent` text DEFAULT '[]',
	`read` integer DEFAULT false,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`repo_id`) REFERENCES `starred_repos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`repo_id` integer NOT NULL,
	`detected_type` text,
	`install_command` text,
	`run_command` text,
	`env_vars` text DEFAULT '{}',
	`pre_hooks` text DEFAULT '[]',
	`post_hooks` text DEFAULT '[]',
	`approved` integer DEFAULT false,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`repo_id`) REFERENCES `starred_repos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipes_repo_id_idx` ON `recipes` (`repo_id`);--> statement-breakpoint
CREATE TABLE `releases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`repo_id` integer NOT NULL,
	`version` text NOT NULL,
	`name` text,
	`published_at` text,
	`changelog` text,
	`seen` integer DEFAULT false,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`repo_id`) REFERENCES `starred_repos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `repo_local_state` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`repo_id` integer NOT NULL,
	`clone_path` text,
	`local_version` text,
	`process_status` text DEFAULT 'stopped',
	`process_pid` integer,
	`process_port` integer,
	`process_memory_mb` real,
	`process_started_at` text,
	`disk_usage_bytes` integer,
	`last_pulled_at` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`repo_id`) REFERENCES `starred_repos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `repo_local_state_repo_id_idx` ON `repo_local_state` (`repo_id`);--> statement-breakpoint
CREATE TABLE `repo_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`repo_id` integer NOT NULL,
	`content` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`repo_id`) REFERENCES `starred_repos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `repo_notes_repo_id_idx` ON `repo_notes` (`repo_id`);--> statement-breakpoint
CREATE TABLE `repo_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tag_id` integer NOT NULL,
	`repo_id` integer NOT NULL,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`repo_id`) REFERENCES `starred_repos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `security_advisories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`repo_id` integer NOT NULL,
	`github_advisory_id` text NOT NULL,
	`severity` text,
	`summary` text,
	`description` text,
	`published_at` text,
	`acknowledged` integer DEFAULT false,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`repo_id`) REFERENCES `starred_repos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `starred_repos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`github_id` integer NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`full_name` text NOT NULL,
	`description` text,
	`homepage_url` text,
	`language` text,
	`topics` text DEFAULT '[]',
	`star_count` integer DEFAULT 0,
	`fork_count` integer DEFAULT 0,
	`open_issues_count` integer DEFAULT 0,
	`last_commit_at` text,
	`last_release_version` text,
	`last_release_at` text,
	`archived` integer DEFAULT false,
	`disabled` integer DEFAULT false,
	`unstarred` integer DEFAULT false,
	`starred_at` text,
	`readme_html` text,
	`readme_updated_at` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `starred_repos_github_id_idx` ON `starred_repos` (`github_id`);--> statement-breakpoint
CREATE TABLE `sync_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`repo_id` integer,
	`sync_type` text NOT NULL,
	`status` text NOT NULL,
	`error_message` text,
	`api_calls_used` integer DEFAULT 0,
	`completed_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`repo_id`) REFERENCES `starred_repos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#6366f1',
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);