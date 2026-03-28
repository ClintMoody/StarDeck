'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StageDropdown } from './stage-dropdown';
import { WatchLevelDropdown } from './watch-level-dropdown';
import { OverflowMenu } from './overflow-menu';
import { compareVersions, formatVersionDisplay } from '@/lib/version-check';

interface BrowseFolder { name: string; path: string; }

interface RepoRowData {
  repo: {
    id: number;
    owner: string;
    name: string;
    fullName: string;
    description: string | null;
    starCount: number;
    lastCommitAt: string | null;
    lastReleaseVersion: string | null;
    latestRemoteSha: string | null;
    workflowStage: string;
    watchLevel: string;
  };
  localState: {
    clonePath: string | null;
    localVersion: string | null;
    localTag: string | null;
    processStatus: string | null;
    diskUsageBytes: number | null;
  } | null;
}

interface RepoTableRowProps {
  data: RepoRowData;
  selected: boolean;
  onSelect: (id: number) => void;
  onOpenDetail: (owner: string, name: string) => void;
  gridTemplate: string;
}


export function RepoTableRow({ data, selected, onSelect, onOpenDetail, gridTemplate }: RepoTableRowProps) {
  const { repo, localState } = data;
  const router = useRouter();

  const isCloned = !!localState?.clonePath;
  const isRunning = localState?.processStatus === 'running';

  // Use real version comparison
  const versionResult = compareVersions({
    localTag: localState?.localTag || null,
    localSha: localState?.localVersion || null,
    latestRelease: repo.lastReleaseVersion || null,
    latestRemoteSha: repo.latestRemoteSha || null,
  });
  const isOutdated = versionResult.status === 'outdated' || versionResult.status === 'vulnerable';
  const versionDisplay = formatVersionDisplay(versionResult);

  // Local status
  let localStatusText = '— Not cloned';
  let localStatusColor = '#484f58';
  if (isRunning) {
    localStatusText = '● Running';
    localStatusColor = '#3fb950';
  } else if (isCloned && isOutdated) {
    localStatusText = '⚠ Outdated';
    localStatusColor = '#f85149';
  } else if (isCloned && versionResult.status === 'up_to_date') {
    localStatusText = '✓ Up to date';
    localStatusColor = '#3fb950';
  } else if (isCloned) {
    localStatusText = '● Cloned';
    localStatusColor = '#8b949e';
  }

  // Disk usage
  const diskDisplay = localState?.diskUsageBytes
    ? formatBytes(localState.diskUsageBytes)
    : '—';

  // Last activity
  const activityDisplay = repo.lastCommitAt
    ? timeAgo(new Date(repo.lastCommitAt))
    : '—';

  const [actionError, setActionError] = useState<string | null>(null);
  const [hasConflict, setHasConflict] = useState(false);
  const [clonePopover, setClonePopover] = useState(false);
  const [cloneDir, setCloneDir] = useState('');
  const [cloneBrowsing, setCloneBrowsing] = useState(false);
  const [browseFolders, setBrowseFolders] = useState<BrowseFolder[]>([]);
  const [browseDir, setBrowseDir] = useState('');
  const [browseParent, setBrowseParent] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!clonePopover) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setClonePopover(false);
        setCloneBrowsing(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [clonePopover]);

  async function openClonePopover() {
    // Fetch default clone directory from settings
    const res = await fetch('/api/settings');
    const settings = await res.json();
    const defaultDir = settings.clone_directory || '~/stardeck-repos';
    setCloneDir(defaultDir);
    setCloneBrowsing(false);
    setClonePopover(true);
  }

  async function openCloneBrowser(dir?: string) {
    const params = dir ? `?dir=${encodeURIComponent(dir)}` : '';
    const res = await fetch(`/api/scan/browse${params}`);
    const data = await res.json();
    if (data.error) return;
    setBrowseDir(data.current);
    setBrowseParent(data.parent);
    setBrowseFolders(data.folders);
    setCloneBrowsing(true);
  }

  function selectCloneDir(dir: string) {
    setCloneDir(dir);
    setCloneBrowsing(false);
  }

  function confirmClone() {
    setClonePopover(false);
    setCloneBrowsing(false);
    callApi('/api/clone', { owner: repo.owner, name: repo.name, targetDir: cloneDir || undefined });
  }

  async function callApi(endpoint: string, body: Record<string, unknown>) {
    setActionError(null);
    setHasConflict(false);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.status === 409 && data.actions) {
        // Conflict — show error with force option
        setActionError(data.detail || data.error);
        setHasConflict(true);
        return;
      }
      if (!res.ok) {
        setActionError(data.error || `Failed (${res.status})`);
        setTimeout(() => setActionError(null), 8000);
        return;
      }
      if (data.warning) {
        setActionError(data.warning);
        setTimeout(() => setActionError(null), 8000);
      }
      router.refresh();
    } catch (e: any) {
      setActionError(e.message || 'Network error');
      setTimeout(() => setActionError(null), 8000);
    }
  }

  function handlePrimaryAction() {
    if (!isCloned) {
      openClonePopover();
      return;
    }
    const endpoint = isOutdated ? '/api/update-repo'
      : isRunning ? '/api/stop'
      : '/api/run';
    callApi(endpoint, { owner: repo.owner, name: repo.name });
  }

  function handleForcePull() {
    callApi('/api/update-repo', { owner: repo.owner, name: repo.name, force: true });
  }

  let primaryLabel = 'Clone';
  let primaryColor = 'bg-[#238636]';
  if (isRunning) {
    primaryLabel = 'Stop';
    primaryColor = 'bg-[#da3633]';
  } else if (isCloned && isOutdated) {
    primaryLabel = 'Update';
    primaryColor = 'bg-[#1f6feb]';
  } else if (isCloned) {
    primaryLabel = 'Run';
    primaryColor = 'bg-[#21262d]';
  }

  return (
    <div
      className={`
        grid items-center border-b border-[#21262d44] text-xs
        hover:bg-[#161b2266] transition-colors
        ${selected ? 'bg-[#1f6feb11]' : ''}
      `}
      style={{ gridTemplateColumns: gridTemplate }}
    >
      <div className="px-2 py-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(repo.id)}
          className="accent-[#1f6feb]"
          onClick={e => e.stopPropagation()}
        />
      </div>

      <div className="py-2 min-w-0 overflow-hidden">
        <button
          onClick={() => onOpenDetail(repo.owner, repo.name)}
          className="text-[#58a6ff] font-semibold hover:underline text-left truncate block max-w-full"
          title={repo.fullName + (repo.description ? ` — ${repo.description}` : '')}
        >
          {repo.fullName}
        </button>
      </div>

      <div className="py-2">
        <StageDropdown repoId={repo.id} currentStage={repo.workflowStage} />
      </div>

      <div className="py-2">
        <WatchLevelDropdown repoId={repo.id} currentLevel={repo.watchLevel} />
      </div>

      <div className="py-2 text-[11px]" style={{ color: localStatusColor }}>
        {localStatusText}
      </div>

      <div className="py-2 text-[10px] text-[#8b949e]">
        {versionDisplay}
      </div>

      <div className="py-2 text-[11px] text-[#8b949e]">
        {activityDisplay}
      </div>

      <div className="py-2 text-[11px] text-[#8b949e]">
        ⭐ {formatNumber(repo.starCount)}
      </div>

      <div className="py-2 text-[11px] text-[#8b949e]">
        {diskDisplay}
      </div>

      <div className="py-2 flex gap-1 items-center flex-wrap relative">
        {actionError && (
          <span className="text-[10px] text-[#f85149] w-full mb-1" title={actionError}>
            {actionError}
          </span>
        )}
        {hasConflict && (
          <div className="flex gap-1 w-full mb-1">
            <button
              onClick={handleForcePull}
              className="text-[10px] px-2 py-0.5 rounded bg-[#da3633] text-white hover:bg-[#f85149]"
            >
              Force Pull (discard local)
            </button>
            <button
              onClick={() => { setActionError(null); setHasConflict(false); }}
              className="text-[10px] px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e] hover:bg-[#30363d]"
            >
              Skip
            </button>
          </div>
        )}
        <button
          onClick={handlePrimaryAction}
          className={`text-[10px] px-2 py-0.5 rounded text-white transition-opacity ${primaryColor} ${!isCloned && !isOutdated ? 'opacity-60 hover:opacity-100' : ''}`}
        >
          {primaryLabel}
        </button>
        {clonePopover && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => { setClonePopover(false); setCloneBrowsing(false); }} />
            <div ref={popoverRef} className="relative w-[480px] bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#21262d]">
                <div className="text-sm text-[#c9d1d9] font-semibold mb-0.5">Clone {repo.fullName}</div>
                <div className="text-xs text-[#8b949e]">Choose where to save this repo</div>
              </div>
              <div className="px-4 py-3 border-b border-[#21262d]">
                <div className="flex gap-2">
                  <span className="flex-1 bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] px-3 py-1.5 rounded-lg text-xs font-mono truncate" title={cloneDir}>
                    {cloneDir}
                  </span>
                  <button
                    onClick={() => openCloneBrowser(cloneDir || undefined)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[#30363d] bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d] transition-colors"
                  >
                    Browse
                  </button>
                </div>
              </div>
              {cloneBrowsing && (
                <div className="border-b border-[#21262d]">
                  <div className="flex items-center gap-2 px-4 py-2 bg-[#0d1117]">
                    <button
                      onClick={() => openCloneBrowser(browseParent)}
                      disabled={browseDir === browseParent}
                      className="text-xs text-[#58a6ff] hover:underline disabled:text-[#484f58]"
                    >
                      Up
                    </button>
                    <span className="text-xs text-[#8b949e] font-mono truncate flex-1" title={browseDir}>{browseDir}</span>
                    <button
                      onClick={() => selectCloneDir(browseDir)}
                      className="text-xs px-2 py-0.5 rounded bg-[#238636] text-white hover:bg-[#2ea043]"
                    >
                      Use
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {browseFolders.length === 0 ? (
                      <div className="text-xs text-[#484f58] px-4 py-4 text-center">No subfolders.</div>
                    ) : (
                      browseFolders.map(f => (
                        <button
                          key={f.path}
                          onClick={() => openCloneBrowser(f.path)}
                          className="w-full text-left px-4 py-1.5 text-sm text-[#c9d1d9] hover:bg-[#21262d] flex items-center gap-2 transition-colors"
                        >
                          <span className="text-[#484f58]">📁</span>
                          {f.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 px-4 py-3 bg-[#0d1117]">
                <button
                  onClick={() => { setClonePopover(false); setCloneBrowsing(false); }}
                  className="text-sm text-[#8b949e] hover:text-[#c9d1d9] px-3 py-1.5 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClone}
                  className="text-sm px-4 py-1.5 rounded-lg bg-[#238636] text-white hover:bg-[#2ea043] transition-colors"
                >
                  Clone Here
                </button>
              </div>
            </div>
          </div>
        )}
        {isCloned && !isRunning && primaryLabel !== 'Run' && (
          <button
            onClick={() => fetch('/api/run', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ owner: repo.owner, name: repo.name }),
            }).then(() => router.refresh())}
            className="text-[10px] px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e]"
          >
            Run
          </button>
        )}
        {isCloned && (
          <button
            className="text-[10px] px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e]"
          >
            📂
          </button>
        )}
        <OverflowMenu
          repoId={repo.id}
          owner={repo.owner}
          name={repo.name}
          fullName={repo.fullName}
          isCloned={isCloned}
        />
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}
