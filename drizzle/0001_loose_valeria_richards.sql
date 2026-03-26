CREATE UNIQUE INDEX `github_list_repos_list_repo_idx` ON `github_list_repos` (`list_id`,`repo_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `repo_tags_tag_repo_idx` ON `repo_tags` (`tag_id`,`repo_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `security_advisories_repo_advisory_idx` ON `security_advisories` (`repo_id`,`github_advisory_id`);