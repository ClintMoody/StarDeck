"use client";

import { useState } from "react";
import type { InferSelectModel } from "drizzle-orm";
import type { starredRepos, repoLocalState } from "@/lib/db/schema";
import { RepoGrid } from "@/components/repo-grid";
import { SlideOutPanel } from "@/components/slide-out-panel";

type Repo = InferSelectModel<typeof starredRepos>;
type LocalState = InferSelectModel<typeof repoLocalState>;

export function MainArea({
  repos,
  localStateMap,
}: {
  repos: Repo[];
  localStateMap: Record<number, LocalState>;
}) {
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);

  return (
    <>
      <RepoGrid repos={repos} onSelectRepo={setSelectedRepo} localStateMap={localStateMap} />
      {selectedRepo && (
        <SlideOutPanel
          repo={selectedRepo}
          onClose={() => setSelectedRepo(null)}
        />
      )}
    </>
  );
}
