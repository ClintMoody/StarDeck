import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getMissionControlRepos, getStageCounts, getAllCollections, getCollectionCounts, getAllSavedViews, getAllTags, getLastSyncTime, type MissionControlFilters } from '@/lib/queries';
import { PipelineBar } from '@/components/mission-control/pipeline-bar';
import { MCSidebar } from '@/components/mission-control/mc-sidebar';
import { RepoTable } from '@/components/mission-control/repo-table';
import { DashboardHeader } from '@/components/dashboard/header';

export default async function MissionControlPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const params = await searchParams;

  const filters: MissionControlFilters = {
    stage: params.stage || undefined,
    search: params.search || undefined,
    watchLevel: params.watchLevel || undefined,
    collectionId: params.collectionId ? Number(params.collectionId) : undefined,
    sort: params.sort || undefined,
    tagId: params.tagId ? Number(params.tagId) : undefined,
  };

  const [repos, stageCounts, collections, collectionCounts, savedViews, tags] = await Promise.all([
    getMissionControlRepos(filters),
    getStageCounts(),
    getAllCollections(),
    getCollectionCounts(),
    getAllSavedViews(),
    getAllTags(),
  ]);

  const lastSyncTime = getLastSyncTime();

  const stageCountMap = Object.fromEntries(stageCounts.map(s => [s.stage, s.count]));
  const totalCount = Object.values(stageCountMap).reduce((sum, c) => sum + c, 0);

  const collectionsWithCounts = collections.map(c => ({
    ...c,
    count: collectionCounts.find(cc => cc.collectionId === c.id)?.count || 0,
  }));

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      <DashboardHeader
        userName={session.user?.name}
        lastSyncTime={lastSyncTime}
      />

      <PipelineBar
        stageCounts={stageCountMap}
        totalCount={totalCount}
        activeStage={filters.stage || null}
      />

      <div className="flex min-h-[calc(100vh-140px)]">
        <MCSidebar
          collections={collectionsWithCounts}
          savedViews={savedViews}
          tags={tags}
          activeFilters={filters}
        />
        <RepoTable
          repos={repos}
          filters={filters}
          totalCount={repos.length}
          activeStage={filters.stage || null}
        />
      </div>
    </div>
  );
}
