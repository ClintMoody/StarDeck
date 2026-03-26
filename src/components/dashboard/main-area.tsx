"use client";

import { useState } from "react";
import type { InferSelectModel } from "drizzle-orm";
import type { starredRepos } from "@/lib/db/schema";
import { RepoGrid } from "@/components/repo-grid";
import { SlideOutPanel } from "@/components/slide-out-panel";

type Repo = InferSelectModel<typeof starredRepos>;

export function MainArea({ repos }: { repos: Repo[] }) {
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);

  return (
    <>
      <RepoGrid repos={repos} onSelectRepo={setSelectedRepo} />
      {selectedRepo && (
        <SlideOutPanel
          repo={selectedRepo}
          onClose={() => setSelectedRepo(null)}
        />
      )}
    </>
  );
}
