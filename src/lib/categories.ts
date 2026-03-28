import { db } from '@/lib/db';
import { dbCategories, repoCategories, starredRepos } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export interface CategoryCount {
  name: string;
  icon: string;
  count: number;
  id: number;
}

interface AutoRules {
  keywords: string[];
}

/**
 * Categorize a single repo using DB-stored category rules.
 * Returns the matched category IDs. Falls back to "Other".
 */
export function categorizeRepo(
  repo: { topics: string | null; description: string | null; fullName: string; language: string | null },
  allCategories: { id: number; name: string; autoRules: string | null }[]
): number[] {
  const topics: string[] = repo.topics ? JSON.parse(repo.topics) : [];
  const topicsLower = new Set(topics.map(t => t.toLowerCase()));

  const freeText = [
    repo.description ?? '',
    repo.fullName.replace(/[/\-_]/g, ' '),
    repo.language ?? '',
  ].join(' ').toLowerCase();

  const matched: number[] = [];

  for (const cat of allCategories) {
    if (!cat.autoRules) continue;
    let rules: AutoRules;
    try { rules = JSON.parse(cat.autoRules); } catch { continue; }
    if (!rules.keywords?.length) continue;

    const hasMatch = rules.keywords.some(kw => {
      if (topicsLower.has(kw)) return true;
      if (kw.includes('-') && topics.some(t => t.toLowerCase().includes(kw))) return true;
      const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return re.test(freeText);
    });

    if (hasMatch) matched.push(cat.id);
  }

  if (matched.length === 0) {
    const other = allCategories.find(c => c.name === 'Other');
    if (other) return [other.id];
  }

  return matched;
}

/**
 * Run auto-sort on all repos that have is_auto = true or no category.
 * Does NOT touch manually assigned repos (is_auto = false).
 */
export function runAutoSort() {
  const allCats = db.select().from(dbCategories).all();
  const allRepos = db.select().from(starredRepos).where(eq(starredRepos.unstarred, false)).all();

  let updated = 0;

  for (const repo of allRepos) {
    const existing = db.select().from(repoCategories).where(eq(repoCategories.repoId, repo.id)).get();
    if (existing && !existing.isAuto) continue; // skip manual overrides

    const matchedIds = categorizeRepo(repo, allCats);
    const primaryId = matchedIds[0];
    if (!primaryId) continue;

    if (existing) {
      if (existing.categoryId !== primaryId) {
        db.update(repoCategories)
          .set({ categoryId: primaryId, isAuto: true })
          .where(eq(repoCategories.repoId, repo.id))
          .run();
        updated++;
      }
    } else {
      db.insert(repoCategories).values({ repoId: repo.id, categoryId: primaryId, isAuto: true }).run();
      updated++;
    }
  }

  return { total: allRepos.length, updated };
}

/**
 * Get category counts for sidebar/dashboard display.
 * Reads from repo_categories join, not computed in-memory.
 */
export function getCategoryCounts(): CategoryCount[] {
  const allCats = db.select().from(dbCategories).all();

  const counts = new Map<number, number>();
  const rows = db.select({ categoryId: repoCategories.categoryId })
    .from(repoCategories)
    .innerJoin(starredRepos, and(eq(starredRepos.id, repoCategories.repoId), eq(starredRepos.unstarred, false)))
    .all();

  for (const row of rows) {
    counts.set(row.categoryId, (counts.get(row.categoryId) ?? 0) + 1);
  }

  return allCats
    .map(cat => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      count: counts.get(cat.id) ?? 0,
    }))
    .filter(c => c.count > 0 || c.name === 'Other')
    .sort((a, b) => b.count - a.count);
}

/**
 * Get repos for a specific category by ID.
 */
export function getReposByCategoryId(categoryId: number) {
  return db.select({ repo: starredRepos })
    .from(starredRepos)
    .innerJoin(repoCategories, eq(repoCategories.repoId, starredRepos.id))
    .where(and(eq(repoCategories.categoryId, categoryId), eq(starredRepos.unstarred, false)))
    .all()
    .map(r => r.repo);
}
