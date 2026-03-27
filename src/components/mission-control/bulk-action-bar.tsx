'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface BulkActionBarProps {
  selectedIds: number[];
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

export function BulkActionBar({ selectedIds, onClear }: BulkActionBarProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[#1f6feb22] border-b border-[#1f6feb44] text-xs">
      <span className="text-[#58a6ff] font-semibold">{selectedIds.length} selected</span>

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
