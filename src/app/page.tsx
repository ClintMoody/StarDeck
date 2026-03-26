import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/layout";
import { DashboardHeader } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { MainArea } from "@/components/dashboard/main-area";
import { SectionedView } from "@/components/dashboard/sectioned-view";
import type { RepoSection } from "@/components/dashboard/sectioned-view";
import {
  getFilteredRepos,
  getReposByTag,
  getAllTags,
  getRepoStats,
  getRecentActivity,
  getLastSyncTime,
  getArchivedCount,
} from "@/lib/queries";
import { getCategoryCounts, getReposByCategory, categorizeRepo } from "@/lib/categories";
import { parseFiltersFromParams } from "@/lib/filters";
import { starredRepos, repoLocalState } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { KeyboardHandler } from "@/components/keyboard-handler";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const filters = parseFiltersFromParams(params);

  // Determine if we're in filtered mode (specific filter active) or home mode
  const isFiltered = !!(filters.search || filters.language || filters.category || filters.tagId || (filters.status && filters.status !== "all"));

  // Fetch all data
  const allRepos = getFilteredRepos({ sort: filters.sort });
  const allTags = getAllTags();
  const categories = getCategoryCounts(allRepos);
  const stats = getRepoStats();
  const archivedCount = getArchivedCount();
  const lastSyncTime = getLastSyncTime();

  // Fetch local state for all repos
  const allLocalState = db.select().from(repoLocalState).all();
  const localStateMap = new Map(allLocalState.map((ls) => [ls.repoId, ls]));
  const localStateObj = Object.fromEntries(localStateMap);

  // Get activity with repo names
  const rawActivity = getRecentActivity();
  const activities = rawActivity.map((item) => {
    const repo = item.repoId
      ? db.select().from(starredRepos).where(eq(starredRepos.id, item.repoId)).get()
      : null;
    return {
      ...item,
      repoName: repo?.fullName ?? "Unknown repo",
    };
  });

  // Build main content based on mode
  let mainContent;

  if (isFiltered) {
    // Filtered mode — show flat grid (existing behavior)
    const repos = filters.status === "archived"
      ? db.select().from(starredRepos).where(eq(starredRepos.unstarred, true)).orderBy(desc(starredRepos.updatedAt)).all()
      : filters.tagId
      ? getReposByTag(filters.tagId)
      : filters.category
      ? getReposByCategory(getFilteredRepos(filters), filters.category)
      : getFilteredRepos(filters);

    mainContent = <MainArea repos={repos} localStateMap={localStateObj} />;
  } else {
    // Home mode — show sectioned overview
    const sections = buildSections(allRepos, localStateMap);
    mainContent = <SectionedView sections={sections} localStateMap={localStateObj} />;
  }

  return (
    <>
      <KeyboardHandler />
      <DashboardLayout
        header={
          <DashboardHeader
            userName={session.user?.name}
            lastSyncTime={lastSyncTime}
          />
        }
        sidebar={
          <Sidebar
            filters={filters}
            repoCount={stats.total}
            categories={categories}
            tags={allTags}
            archivedCount={archivedCount}
          />
        }
        main={mainContent}
        activityFeed={<ActivityFeed activities={activities} />}
      />
    </>
  );
}

/**
 * Build the sectioned view from all repos + local state.
 */
function buildSections(
  allRepos: ReturnType<typeof getFilteredRepos>,
  localStateMap: Map<number, any>
): RepoSection[] {
  const sections: RepoSection[] = [];

  // 1. ACTIVE NOW — repos that are running or were recently cloned
  const activeRepos = allRepos.filter((r) => {
    const state = localStateMap.get(r.id);
    return state && (state.processStatus === "running" || state.processStatus === "installing");
  });

  sections.push({
    id: "active",
    title: "Active Now",
    icon: "🟢",
    repos: activeRepos,
    priority: "high",
    emptyMessage: "No repos running. Clone and run a repo to see it here.",
  });

  // 2. RECENTLY CLONED — repos that have local state but aren't running
  const clonedRepos = allRepos.filter((r) => {
    const state = localStateMap.get(r.id);
    return state?.clonePath && state.processStatus !== "running" && state.processStatus !== "installing";
  });

  if (clonedRepos.length > 0) {
    sections.push({
      id: "cloned",
      title: "Cloned Locally",
      icon: "💾",
      repos: clonedRepos,
      priority: "high",
    });
  }

  // 3. RECENTLY STARRED — last 8 repos starred (your inbox)
  const recentlyStarred = [...allRepos]
    .sort((a, b) => {
      const dateA = a.starredAt ? new Date(a.starredAt).getTime() : 0;
      const dateB = b.starredAt ? new Date(b.starredAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 8);

  sections.push({
    id: "recent",
    title: "Recently Starred",
    icon: "✨",
    repos: recentlyStarred,
    priority: "high",
  });

  // 4. CATEGORY SECTIONS — group remaining repos by category
  const categoryMap = new Map<string, typeof allRepos>();

  for (const repo of allRepos) {
    const cats = categorizeRepo(repo);
    for (const cat of cats) {
      if (!categoryMap.has(cat)) categoryMap.set(cat, []);
      categoryMap.get(cat)!.push(repo);
    }
  }

  // Sort categories by count (largest first)
  const sortedCategories = [...categoryMap.entries()]
    .sort((a, b) => b[1].length - a[1].length);

  const categoryIcons: Record<string, string> = {
    "AI & Agents": "🤖",
    "Security & OSINT": "🔒",
    "Developer Tools": "🛠️",
    "Audio & Music": "🎵",
    "Knowledge & Memory": "📚",
    "Geolocation & Maps": "🗺️",
    "Mobile & Desktop": "📱",
    "Backend & Infra": "⚙️",
    "Automation & Browser": "🌐",
    "Other": "📁",
  };

  for (const [catName, catRepos] of sortedCategories) {
    sections.push({
      id: `cat-${catName}`,
      title: catName,
      icon: categoryIcons[catName] ?? "📁",
      repos: catRepos,
      priority: "normal",
    });
  }

  return sections;
}
