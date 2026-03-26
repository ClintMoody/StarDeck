import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/layout";
import { DashboardHeader } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { MainArea } from "@/components/dashboard/main-area";
import {
  getFilteredRepos,
  getReposByTag,
  getAllTags,
  getRepoStats,
  getRecentActivity,
  getLastSyncTime,
} from "@/lib/queries";
import { getCategoryCounts, getReposByCategory } from "@/lib/categories";
import { parseFiltersFromParams } from "@/lib/filters";
import { starredRepos } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
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

  // Fetch all data
  const allRepos = getFilteredRepos({ sort: filters.sort });
  const repos = filters.tagId
    ? getReposByTag(filters.tagId)
    : filters.category
    ? getReposByCategory(getFilteredRepos(filters), filters.category)
    : getFilteredRepos(filters);
  const allTags = getAllTags();
  const categories = getCategoryCounts(allRepos);
  const stats = getRepoStats();
  const lastSyncTime = getLastSyncTime();

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
          />
        }
        main={<MainArea repos={repos} />}
        activityFeed={<ActivityFeed activities={activities} />}
      />
    </>
  );
}
