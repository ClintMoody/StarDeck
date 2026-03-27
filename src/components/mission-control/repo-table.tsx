'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RepoTableRow } from './repo-table-row';
import { BulkActionBar } from './bulk-action-bar';
import { MissionControlFilters } from '@/lib/queries';

interface RepoData {
  repo: any;
  localState: any;
}

interface RepoTableProps {
  repos: RepoData[];
  filters: MissionControlFilters;
  totalCount: number;
}

const SORT_OPTIONS = [
  { key: 'activity_desc', label: 'Last Activity' },
  { key: 'stars_desc', label: 'Most Stars' },
  { key: 'name_asc', label: 'Name A-Z' },
  { key: 'starred_desc', label: 'Recently Starred' },
  { key: 'disk_desc', label: 'Disk Usage' },
];

export function RepoTable({ repos, filters, totalCount }: RepoTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailRepo, setDetailRepo] = useState<{ owner: string; name: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

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

  const totalDiskBytes = repos.reduce((sum, r) => sum + (r.localState?.diskUsageBytes || 0), 0);
  const clonedCount = repos.filter(r => r.localState?.clonePath).length;

  return (
    <div className="flex-1 min-w-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#21262d] bg-[#161b22]">
        <input
          type="text"
          placeholder="Search repos..."
          defaultValue={filters.search || ''}
          onKeyDown={e => e.key === 'Enter' && handleSearch((e.target as HTMLInputElement).value)}
          className="bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] px-2.5 py-1 rounded-md text-xs w-56"
        />

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

      {/* Table header */}
      <div
        className="grid px-4 py-1.5 border-b border-[#21262d] bg-[#161b22] text-[11px] text-[#8b949e] font-semibold"
        style={{ gridTemplateColumns: '28px 2fr 110px 110px 130px 90px 70px 70px 160px' }}
      >
        <div className="px-0">
          <input
            type="checkbox"
            checked={selectedIds.size === repos.length && repos.length > 0}
            onChange={selectAll}
            className="accent-[#1f6feb]"
          />
        </div>
        <div>Repository</div>
        <div>Stage</div>
        <div>Local</div>
        <div>Version</div>
        <div>Activity</div>
        <div>Stars</div>
        <div>Disk</div>
        <div>Actions</div>
      </div>

      {/* Rows */}
      <div className="px-4">
        {repos.length === 0 ? (
          <div className="text-center text-[#484f58] py-12 text-sm">
            No repos match the current filters.
          </div>
        ) : (
          repos.map(data => (
            <RepoTableRow
              key={data.repo.id}
              data={data}
              selected={selectedIds.has(data.repo.id)}
              onSelect={toggleSelect}
              onOpenDetail={(owner, name) => setDetailRepo({ owner, name })}
            />
          ))
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
