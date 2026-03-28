import { sqliteTable, text, integer, real, uniqueIndex, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─── Workflow Stages ───────────────────────────────────

export const workflowStages = sqliteTable('workflow_stages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  position: integer('position').notNull(),
  deletable: integer('deletable', { mode: 'boolean' }).notNull().default(true),
});

// ─── Starred Repos ───────────────────────────────────────

export const starredRepos = sqliteTable(
  "starred_repos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    githubId: integer("github_id").notNull(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    fullName: text("full_name").notNull(),
    description: text("description"),
    homepageUrl: text("homepage_url"),
    language: text("language"),
    topics: text("topics").default("[]"),
    starCount: integer("star_count").default(0),
    forkCount: integer("fork_count").default(0),
    openIssuesCount: integer("open_issues_count").default(0),
    lastCommitAt: text("last_commit_at"),
    lastReleaseVersion: text("last_release_version"),
    lastReleaseAt: text("last_release_at"),
    archived: integer("archived", { mode: "boolean" }).default(false),
    disabled: integer("disabled", { mode: "boolean" }).default(false),
    unstarred: integer("unstarred", { mode: "boolean" }).default(false),
    starredAt: text("starred_at"),
    readmeHtml: text("readme_html"),
    readmeUpdatedAt: text("readme_updated_at"),
    createdAt: text("created_at").default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").default(sql`(datetime('now'))`),
    workflowStage: text('workflow_stage').notNull().default('watching'),
    watchLevel: text('watch_level').notNull().default('releases_only'),
    latestRemoteSha: text('latest_remote_sha'),
    workflowStageId: integer('workflow_stage_id').references(() => workflowStages.id),
  },
  (table) => [uniqueIndex("starred_repos_github_id_idx").on(table.githubId)]
);

// ─── GitHub Lists ────────────────────────────────────────

export const githubLists = sqliteTable("github_lists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  githubId: integer("github_id"),
  name: text("name").notNull(),
  description: text("description"),
  syncedAt: text("synced_at"),
});

export const githubListRepos = sqliteTable(
  "github_list_repos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    listId: integer("list_id")
      .notNull()
      .references(() => githubLists.id, { onDelete: "cascade" }),
    repoId: integer("repo_id")
      .notNull()
      .references(() => starredRepos.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("github_list_repos_list_repo_idx").on(table.listId, table.repoId)]
);

// ─── Tags ────────────────────────────────────────────────

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  color: text("color").default("#6366f1"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const repoTags = sqliteTable(
  "repo_tags",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    repoId: integer("repo_id")
      .notNull()
      .references(() => starredRepos.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("repo_tags_tag_repo_idx").on(table.tagId, table.repoId)]
);

// ─── Local State ─────────────────────────────────────────

export const repoLocalState = sqliteTable(
  "repo_local_state",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    repoId: integer("repo_id")
      .notNull()
      .references(() => starredRepos.id, { onDelete: "cascade" }),
    clonePath: text("clone_path"),
    localVersion: text("local_version"),
    processStatus: text("process_status").default("stopped"),
    processPid: integer("process_pid"),
    processPort: integer("process_port"),
    processMemoryMb: real("process_memory_mb"),
    processStartedAt: text("process_started_at"),
    diskUsageBytes: integer("disk_usage_bytes"),
    lastPulledAt: text("last_pulled_at"),
    localTag: text('local_tag'),
    createdAt: text("created_at").default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").default(sql`(datetime('now'))`),
  },
  (table) => [uniqueIndex("repo_local_state_repo_id_idx").on(table.repoId)]
);

// ─── Recipes ─────────────────────────────────────────────

export const recipes = sqliteTable(
  "recipes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    repoId: integer("repo_id")
      .notNull()
      .references(() => starredRepos.id, { onDelete: "cascade" }),
    detectedType: text("detected_type"),
    installCommand: text("install_command"),
    runCommand: text("run_command"),
    envVars: text("env_vars").default("{}"),
    preHooks: text("pre_hooks").default("[]"),
    postHooks: text("post_hooks").default("[]"),
    approved: integer("approved", { mode: "boolean" }).default(false),
    createdAt: text("created_at").default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").default(sql`(datetime('now'))`),
  },
  (table) => [uniqueIndex("recipes_repo_id_idx").on(table.repoId)]
);

// ─── Releases ────────────────────────────────────────────

export const releases = sqliteTable("releases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  repoId: integer("repo_id")
    .notNull()
    .references(() => starredRepos.id, { onDelete: "cascade" }),
  version: text("version").notNull(),
  name: text("name"),
  publishedAt: text("published_at"),
  changelog: text("changelog"),
  seen: integer("seen", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ─── Security Advisories ─────────────────────────────────

export const securityAdvisories = sqliteTable(
  "security_advisories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    repoId: integer("repo_id")
      .notNull()
      .references(() => starredRepos.id, { onDelete: "cascade" }),
    githubAdvisoryId: text("github_advisory_id").notNull(),
    severity: text("severity"),
    summary: text("summary"),
    description: text("description"),
    publishedAt: text("published_at"),
    acknowledged: integer("acknowledged", { mode: "boolean" }).default(false),
    createdAt: text("created_at").default(sql`(datetime('now'))`),
  },
  (table) => [uniqueIndex("security_advisories_repo_advisory_idx").on(table.repoId, table.githubAdvisoryId)]
);

// ─── Compatibility Checks ────────────────────────────────

export const compatibilityChecks = sqliteTable("compatibility_checks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  repoId: integer("repo_id")
    .notNull()
    .references(() => starredRepos.id, { onDelete: "cascade" }),
  runtime: text("runtime").notNull(),
  requiredVersion: text("required_version"),
  localVersion: text("local_version"),
  compatible: integer("compatible", { mode: "boolean" }),
  checkedAt: text("checked_at"),
});

// ─── Notifications ───────────────────────────────────────

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  repoId: integer("repo_id").references(() => starredRepos.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message"),
  channelsSent: text("channels_sent").default("[]"),
  read: integer("read", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ─── Repo Notes ──────────────────────────────────────────

export const repoNotes = sqliteTable(
  "repo_notes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    repoId: integer("repo_id")
      .notNull()
      .references(() => starredRepos.id, { onDelete: "cascade" }),
    content: text("content").default(""),
    createdAt: text("created_at").default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").default(sql`(datetime('now'))`),
  },
  (table) => [uniqueIndex("repo_notes_repo_id_idx").on(table.repoId)]
);

// ─── Settings ────────────────────────────────────────────

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// ─── Sync Log ────────────────────────────────────────────

export const syncLog = sqliteTable("sync_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  repoId: integer("repo_id").references(() => starredRepos.id, { onDelete: "cascade" }),
  syncType: text("sync_type").notNull(),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  apiCallsUsed: integer("api_calls_used").default(0),
  completedAt: text("completed_at").default(sql`(datetime('now'))`),
});

// ─── Collections ────────────────────────────────────────

export const collections = sqliteTable('collections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#8b949e'),
  autoRules: text('auto_rules'), // JSON: { topics?: string[], languages?: string[], keywords?: string[] }
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const collectionRepos = sqliteTable('collection_repos', {
  collectionId: integer('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  repoId: integer('repo_id').notNull().references(() => starredRepos.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.collectionId, table.repoId] }),
]);

// ─── Scan Directories ───────────────────────────────────

export const scanDirectories = sqliteTable('scan_directories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  path: text('path').notNull().unique(),
  recursive: integer('recursive', { mode: 'boolean' }).notNull().default(true),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  lastScannedAt: text('last_scanned_at'),
});

// ─── Repo Activity ──────────────────────────────────────

export const repoActivity = sqliteTable('repo_activity', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  repoId: integer('repo_id').notNull().references(() => starredRepos.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'commit_summary' | 'issue' | 'pull_request' | 'release' | 'fork' | 'star_milestone'
  summary: text('summary').notNull(),
  data: text('data'), // JSON with type-specific details
  externalUrl: text('external_url'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Saved Views ────────────────────────────────────────

export const savedViews = sqliteTable('saved_views', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  filters: text('filters').notNull(), // JSON: { stage?, collection?, watchLevel?, sort?, search?, tags? }
  builtIn: integer('built_in', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Categories (DB-driven) ────────────────────────────

export const dbCategories = sqliteTable('db_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  position: integer('position').notNull(),
  autoRules: text('auto_rules'),
});

// ─── Repo Categories ───────────────────────────────────

export const repoCategories = sqliteTable('repo_categories', {
  repoId: integer('repo_id').notNull().references(() => starredRepos.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').notNull().references(() => dbCategories.id, { onDelete: 'cascade' }),
  isAuto: integer('is_auto', { mode: 'boolean' }).notNull().default(true),
}, (table) => [
  uniqueIndex('repo_categories_repo_cat_idx').on(table.repoId, table.categoryId),
]);
