import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'stardeck.db');

export function migrateMissionControl() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.transaction(() => {
    // Add columns to starredRepos (ignore if already exist)
    const starredCols = db.prepare(
      "SELECT name FROM pragma_table_info('starred_repos')"
    ).all().map((r: any) => r.name);

    if (!starredCols.includes('workflow_stage')) {
      db.exec("ALTER TABLE starred_repos ADD COLUMN workflow_stage TEXT NOT NULL DEFAULT 'watching'");
    }
    if (!starredCols.includes('watch_level')) {
      db.exec("ALTER TABLE starred_repos ADD COLUMN watch_level TEXT NOT NULL DEFAULT 'releases_only'");
    }

    // Add localTag to repo_local_state
    const localCols = db.prepare(
      "SELECT name FROM pragma_table_info('repo_local_state')"
    ).all().map((r: any) => r.name);

    if (!localCols.includes('local_tag')) {
      db.exec("ALTER TABLE repo_local_state ADD COLUMN local_tag TEXT");
    }

    // Create new tables (IF NOT EXISTS)
    db.exec(`
      CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#8b949e',
        auto_rules TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS collection_repos (
        collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
        repo_id INTEGER NOT NULL REFERENCES starred_repos(id) ON DELETE CASCADE,
        PRIMARY KEY (collection_id, repo_id)
      );

      CREATE TABLE IF NOT EXISTS scan_directories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT NOT NULL UNIQUE,
        recursive INTEGER NOT NULL DEFAULT 1,
        enabled INTEGER NOT NULL DEFAULT 1,
        last_scanned_at TEXT
      );

      CREATE TABLE IF NOT EXISTS repo_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repo_id INTEGER NOT NULL REFERENCES starred_repos(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        summary TEXT NOT NULL,
        data TEXT,
        external_url TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS saved_views (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        filters TEXT NOT NULL,
        built_in INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Backfill workflow stages based on existing data
    db.exec(`
      UPDATE starred_repos SET workflow_stage = 'active'
      WHERE id IN (
        SELECT repo_id FROM repo_local_state
        WHERE process_status = 'running'
      ) AND workflow_stage = 'watching'
    `);

    db.exec(`
      UPDATE starred_repos SET workflow_stage = 'downloaded'
      WHERE id IN (
        SELECT repo_id FROM repo_local_state
        WHERE clone_path IS NOT NULL AND clone_path != ''
      ) AND workflow_stage = 'watching'
    `);

    // Seed built-in saved views
    const viewCount = db.prepare("SELECT COUNT(*) as cnt FROM saved_views WHERE built_in = 1").get() as any;
    if (viewCount.cnt === 0) {
      const insertView = db.prepare(
        "INSERT INTO saved_views (name, filters, built_in) VALUES (?, ?, 1)"
      );
      insertView.run('Needs Attention', JSON.stringify({ localStatus: 'outdated', includeVulnerable: true }));
      insertView.run('Ready to Try', JSON.stringify({ stage: 'want_to_try', sort: 'stars_desc' }));
      insertView.run('Space Hogs', JSON.stringify({ localStatus: 'downloaded', sort: 'disk_desc' }));
    }
  })();

  db.close();
}
