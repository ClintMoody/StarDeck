DROP INDEX `repo_categories_repo_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `repo_categories_repo_cat_idx` ON `repo_categories` (`repo_id`,`category_id`);