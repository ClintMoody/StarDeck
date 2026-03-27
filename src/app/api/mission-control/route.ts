import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getMissionControlRepos, getStageCounts, getAllCollections, getCollectionCounts, getAllSavedViews, MissionControlFilters } from '@/lib/queries';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = req.nextUrl.searchParams;

  const filters: MissionControlFilters = {
    stage: params.get('stage') || undefined,
    search: params.get('search') || undefined,
    watchLevel: params.get('watchLevel') || undefined,
    collectionId: params.get('collectionId') ? Number(params.get('collectionId')) : undefined,
    localStatus: params.get('localStatus') || undefined,
    sort: params.get('sort') || undefined,
    tagId: params.get('tagId') ? Number(params.get('tagId')) : undefined,
  };

  const [repos, stageCounts, collections, collectionCounts, savedViews] = await Promise.all([
    getMissionControlRepos(filters),
    getStageCounts(),
    getAllCollections(),
    getCollectionCounts(),
    getAllSavedViews(),
  ]);

  return NextResponse.json({
    repos,
    stageCounts: Object.fromEntries(stageCounts.map(s => [s.stage, s.count])),
    collections: collections.map(c => ({
      ...c,
      count: collectionCounts.find(cc => cc.collectionId === c.id)?.count || 0,
    })),
    savedViews,
  });
}
