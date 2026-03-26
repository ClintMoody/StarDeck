"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { InferSelectModel } from "drizzle-orm";
import type { starredRepos, repoLocalState } from "@/lib/db/schema";
import { RepoGrid } from "@/components/repo-grid";
import { SlideOutPanel } from "@/components/slide-out-panel";
import { BulkToolbar } from "@/components/bulk-toolbar";

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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const router = useRouter();

  const handleSelect = useCallback((id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  function handleBulkComplete() {
    setSelectedIds(new Set());
    router.refresh();
  }

  const bulkMode = selectedIds.size > 0;

  return (
    <>
      {bulkMode && (
        <BulkToolbar
          selectedCount={selectedIds.size}
          selectedIds={Array.from(selectedIds)}
          onClear={() => setSelectedIds(new Set())}
          onComplete={handleBulkComplete}
        />
      )}
      <RepoGrid
        repos={repos}
        onSelectRepo={bulkMode ? undefined : setSelectedRepo}
        localStateMap={localStateMap}
        selectedIds={selectedIds}
        onSelect={handleSelect}
      />
      {selectedRepo && !bulkMode && (
        <SlideOutPanel
          repo={selectedRepo}
          onClose={() => setSelectedRepo(null)}
        />
      )}
    </>
  );
}
