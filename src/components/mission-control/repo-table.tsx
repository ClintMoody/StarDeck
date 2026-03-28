'use client';

import { useState, useCallback, useRef, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RepoTableRow } from './repo-table-row';
import { BulkActionBar } from './bulk-action-bar';
import { SlideOutPanel } from '@/components/slide-out-panel';
import { MissionControlFilters } from '@/lib/queries';

interface RepoData {
  repo: any;
  localState: any;
}

interface RepoTableProps {
  repos: RepoData[];
  filters: MissionControlFilters;
  totalCount: number;
  activeStage: string | null;
  stages: { id: number; name: string; icon: string; color: string }[];
  categories: { id: number; name: string; icon: string; color: string }[];
  repoCategoryMap: Record<number, { categoryIds: number[]; hasManualOverride: boolean }>;
}

const SORT_OPTIONS = [
  { key: 'activity_desc', label: 'Last Activity' },
  { key: 'stars_desc', label: 'Most Stars' },
  { key: 'name_asc', label: 'Name A-Z' },
  { key: 'starred_desc', label: 'Recently Starred' },
  { key: 'disk_desc', label: 'Disk Usage' },
];

const DEFAULT_COLUMNS = [
  { key: 'checkbox', label: '', width: 28, minWidth: 28, resizable: false },
  { key: 'repo', label: 'Repository', width: 250, minWidth: 150, resizable: true },
  { key: 'stage', label: 'Stage', width: 120, minWidth: 80, resizable: true },
  { key: 'category', label: 'Category', width: 150, minWidth: 100, resizable: true },
  { key: 'watch', label: 'Watch', width: 140, minWidth: 100, resizable: true },
  { key: 'local', label: 'Local', width: 100, minWidth: 80, resizable: true },
  { key: 'version', label: 'Version', width: 130, minWidth: 80, resizable: true },
  { key: 'activity', label: 'Activity', width: 80, minWidth: 60, resizable: true },
  { key: 'stars', label: 'Stars', width: 70, minWidth: 50, resizable: true },
  { key: 'disk', label: 'Disk', width: 60, minWidth: 50, resizable: true },
  { key: 'actions', label: 'Actions', width: 140, minWidth: 100, resizable: true },
];

const EMPTY_STATE_MESSAGES: Record<string, { title: string; hint: string }> = {
  want_to_try: { title: 'No repos queued to try', hint: 'Change a repo\'s stage to "Want to Try" to queue it here.' },
  downloaded: { title: 'No downloaded repos', hint: 'Clone a repo or scan your directories to find local copies.' },
  active: { title: 'No active projects', hint: 'Run a downloaded repo to move it here automatically.' },
  archived: { title: 'No archived repos', hint: 'Move repos here when you\'re done with them.' },
};

export function RepoTable({ repos, filters, totalCount, activeStage, stages, categories, repoCategoryMap }: RepoTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailRepo, setDetailRepo] = useState<{ owner: string; name: string } | null>(null);
  const [columnWidths, setColumnWidths] = useState(() => DEFAULT_COLUMNS.map(c => c.width));
  const router = useRouter();
  const searchParams = useSearchParams();
  const resizingRef = useRef<{ colIndex: number; startX: number; startWidth: number } | null>(null);
  const [isChecking, startCheckTransition] = useTransition();
  const [checkResult, setCheckResult] = useState<string | null>(null);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === repos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(repos.map(r => r.repo.id)));
    }
  }, [repos, selectedIds.size]);

  function handleSort(sortKey: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', sortKey);
    router.push(`/mission-control?${params.toString()}`);
  }

  function handleSearch(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('search', value);
    else params.delete('search');
    router.push(`/mission-control?${params.toString()}`);
  }

  // Column resize handlers
  function onResizeStart(e: React.MouseEvent, colIndex: number) {
    e.preventDefault();
    resizingRef.current = { colIndex, startX: e.clientX, startWidth: columnWidths[colIndex] };

    function onMouseMove(e: MouseEvent) {
      if (!resizingRef.current) return;
      const diff = e.clientX - resizingRef.current.startX;
      const newWidth = Math.max(DEFAULT_COLUMNS[resizingRef.current.colIndex].minWidth, resizingRef.current.startWidth + diff);
      setColumnWidths(prev => {
        const next = [...prev];
        next[resizingRef.current!.colIndex] = newWidth;
        return next;
      });
    }

    function onMouseUp() {
      resizingRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  const gridTemplate = columnWidths.map(w => `${w}px`).join(' ');

  const totalDiskBytes = repos.reduce((sum, r) => sum + (r.localState?.diskUsageBytes || 0), 0);
  const clonedCount = repos.filter(r => r.localState?.clonePath).length;

  function handleCheckUpdates() {
    setCheckResult(null);
    startCheckTransition(async () => {
      const res = await fetch('/api/check-updates', { method: 'POST' });
      const data = await res.json();
      if (data.checked === 0) {
        setCheckResult('No cloned repos to check');
      } else if (data.updated === 0) {
        setCheckResult(`All ${data.checked} repos up to date`);
      } else {
        setCheckResult(`${data.updated} of ${data.checked} repos have updates`);
      }
      router.refresh();
      setTimeout(() => setCheckResult(null), 5000);
    });
  }

  // Empty state for specific pipeline tabs
  const emptyState = activeStage && EMPTY_STATE_MESSAGES[activeStage];

  return (
    <div className="flex-1 min-w-0 overflow-x-auto">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#21262d] bg-[#161b22]">
        <input
          type="text"
          placeholder="Search repos..."
          defaultValue={filters.search || ''}
          onKeyDown={e => e.key === 'Enter' && handleSearch((e.target as HTMLInputElement).value)}
          className="bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] px-2.5 py-1 rounded-md text-xs w-56"
        />

        <button
          onClick={handleCheckUpdates}
          disabled={isChecking}
          className="text-[11px] px-2.5 py-1 rounded-md border border-[#30363d] bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d] disabled:opacity-50 disabled:cursor-wait transition-colors"
        >
          {isChecking ? 'Checking...' : 'Check Updates'}
        </button>

        {checkResult && (
          <span className="text-[11px] text-[#3fb950]">{checkResult}</span>
        )}

        <span className="text-[#8b949e] text-[11px] ml-auto">
          {totalCount} repos
          {clonedCount > 0 && ` · ${clonedCount} cloned · ${formatBytes(totalDiskBytes)}`}
        </span>

        <select
          value={filters.sort || 'activity_desc'}
          onChange={e => handleSort(e.target.value)}
          className="bg-[#0d1117] border border-[#30363d] text-[#8b949e] text-[11px] px-2 py-1 rounded"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedIds={Array.from(selectedIds)}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      {/* Table header with resize handles */}
      <div
        className="grid px-4 py-1.5 border-b border-[#21262d] bg-[#161b22] text-[11px] text-[#8b949e] font-semibold select-none"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {DEFAULT_COLUMNS.map((col, i) => (
          <div key={col.key} className="relative flex items-center">
            {col.key === 'checkbox' ? (
              <input
                type="checkbox"
                checked={selectedIds.size === repos.length && repos.length > 0}
                onChange={selectAll}
                className="accent-[#1f6feb]"
              />
            ) : (
              <span className="truncate">{col.label}</span>
            )}
            {col.resizable && (
              <div
                onMouseDown={e => onResizeStart(e, i)}
                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#1f6feb] transition-colors"
                style={{ marginRight: '-3px' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="px-4">
        {repos.length === 0 ? (
          <div className="text-center py-16">
            {emptyState ? (
              <>
                <div className="text-[#8b949e] text-sm mb-2">{emptyState.title}</div>
                <div className="text-[#484f58] text-xs">{emptyState.hint}</div>
              </>
            ) : (
              <div className="text-[#484f58] text-sm">No repos match the current filters.</div>
            )}
          </div>
        ) : (
          repos.map(data => (
            <RepoTableRow
              key={data.repo.id}
              data={data}
              selected={selectedIds.has(data.repo.id)}
              onSelect={toggleSelect}
              onOpenDetail={(owner, name) => setDetailRepo({ owner, name })}
              gridTemplate={gridTemplate}
              stages={stages}
              categories={categories}
              repoCategoryMap={repoCategoryMap}
            />
          ))
        )}
      </div>

      {detailRepo && (() => {
        const match = repos.find(r => r.repo.owner === detailRepo.owner && r.repo.name === detailRepo.name);
        if (!match) return null;
        return <SlideOutPanel repo={match.repo} onClose={() => setDetailRepo(null)} />;
      })()}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
