import type { InferSelectModel } from "drizzle-orm";
import type { starredRepos, repoLocalState } from "@/lib/db/schema";
import { RepoCard } from "./repo-card";

type Repo = InferSelectModel<typeof starredRepos>;
type LocalState = InferSelectModel<typeof repoLocalState>;

export function RepoGrid({
  repos,
  onSelectRepo,
  localStateMap,
}: {
  repos: Repo[];
  onSelectRepo?: (repo: Repo) => void;
  localStateMap?: Record<number, LocalState>;
}) {
  if (repos.length === 0) {
    return (
      <div className="text-center text-gray-500 py-16">
        <p className="text-lg mb-2">No repos synced yet</p>
        <p className="text-sm">Click &quot;Sync Now&quot; to fetch your starred repos</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {repos.map((repo) => (
        <RepoCard
          key={repo.id}
          repo={repo}
          onClick={onSelectRepo ? () => onSelectRepo(repo) : undefined}
          status={localStateMap?.[repo.id]?.processStatus ?? undefined}
        />
      ))}
    </div>
  );
}
