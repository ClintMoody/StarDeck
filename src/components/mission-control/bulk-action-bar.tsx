'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RepoInfo {
  id: number;
  owner: string;
  name: string;
  clonePath: string | null;
}

interface BulkActionBarProps {
  selectedIds: number[];
  repos: RepoInfo[];
  onClear: () => void;
}

const STAGES = [
  { key: 'watching', label: 'Watching' },
  { key: 'want_to_try', label: 'Want to Try' },
  { key: 'downloaded', label: 'Downloaded' },
  { key: 'active', label: 'Active' },
  { key: 'archived', label: 'Archived' },
];

const WATCH_LEVELS = [
  { key: 'releases_only', label: 'Releases Only' },
  { key: 'active_tracking', label: 'Active Tracking' },
  { key: 'full_watch', label: 'Full Watch' },
];

export function BulkActionBar({ selectedIds, repos, onClear }: BulkActionBarProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cloneProgress, setCloneProgress] = useState<string | null>(null);

  async function bulkSetStage(stage: string) {
    setLoading(true);
    await fetch('/api/workflow-stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoIds: selectedIds, stage }),
    });
    setLoading(false);
    onClear();
    router.refresh();
  }

  async function bulkSetWatchLevel(level: string) {
    setLoading(true);
    await fetch('/api/watch-level', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoIds: selectedIds, level }),
    });
    setLoading(false);
    onClear();
    router.refresh();
  }

  async function bulkClone() {
    const toClone = repos.filter(r => selectedIds.includes(r.id) && !r.clonePath);
    if (toClone.length === 0) {
      setCloneProgress('All selected repos are already cloned');
      setTimeout(() => setCloneProgress(null), 3000);
      return;
    }

    setLoading(true);
    let done = 0;
    let failed = 0;

    for (const repo of toClone) {
      setCloneProgress(`Cloning ${done + 1}/${toClone.length}: ${repo.owner}/${repo.name}`);
      try {
        const res = await fetch('/api/clone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ owner: repo.owner, name: repo.name }),
        });
        if (!res.ok) failed++;
      } catch {
        failed++;
      }
      done++;
    }

    setCloneProgress(
      failed === 0
        ? `Cloned ${done} repos`
        : `Cloned ${done - failed}/${done} (${failed} failed)`
    );
    setLoading(false);
    router.refresh();
    setTimeout(() => setCloneProgress(null), 5000);
  }

  const unclonedCount = repos.filter(r => selectedIds.includes(r.id) && !r.clonePath).length;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[#1f6feb22] border-b border-[#1f6feb44] text-xs">
      <span className="text-[#58a6ff] font-semibold">{selectedIds.length} selected</span>

      {unclonedCount > 0 && (
        <button
          onClick={bulkClone}
          disabled={loading}
          className="px-2.5 py-1 rounded bg-[#238636] text-white hover:bg-[#2ea043] disabled:opacity-50 disabled:cursor-wait transition-colors"
        >
          {loading && cloneProgress ? cloneProgress : `Clone ${unclonedCount} repos`}
        </button>
      )}

      {cloneProgress && !loading && (
        <span className="text-[#3fb950]">{cloneProgress}</span>
      )}

      <select
        disabled={loading}
        defaultValue=""
        onChange={e => { if (e.target.value) bulkSetStage(e.target.value); e.target.value = ''; }}
        className="bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-[11px] px-2 py-1 rounded"
      >
        <option value="" disabled>Move to stage...</option>
        {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>

      <select
        disabled={loading}
        defaultValue=""
        onChange={e => { if (e.target.value) bulkSetWatchLevel(e.target.value); e.target.value = ''; }}
        className="bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-[11px] px-2 py-1 rounded"
      >
        <option value="" disabled>Set watch level...</option>
        {WATCH_LEVELS.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
      </select>

      <button
        onClick={onClear}
        className="text-[#8b949e] hover:text-[#c9d1d9] ml-auto"
      >
        Clear selection
      </button>
    </div>
  );
}
