import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/layout";
import { DashboardHeader } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { RepoGrid } from "@/components/repo-grid";
import {
  getFilteredRepos,
  getReposByTag,
  getAllTags,
  getLanguageCounts,
  getRepoStats,
  getRecentActivity,
  getLastSyncTime,
} from "@/lib/queries";
import { parseFiltersFromParams } from "@/lib/filters";
import { starredRepos } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";

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

  // Fetch all data in parallel
  const repos = filters.tagId
    ? getReposByTag(filters.tagId)
    : getFilteredRepos(filters);
  const allTags = getAllTags();
  const languages = getLanguageCounts();
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
          languages={languages}
          tags={allTags}
        />
      }
      main={<RepoGrid repos={repos} />}
      activityFeed={<ActivityFeed activities={activities} />}
    />
  );
}
