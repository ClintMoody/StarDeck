'use client';

import { useRouter } from 'next/navigation';
import { StageDropdown } from './stage-dropdown';

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
}

const WATCH_ICONS: Record<string, string> = {
  releases_only: '🔕',
  active_tracking: '📡',
  full_watch: '📺',
};

export function RepoTableRow({ data, selected, onSelect, onOpenDetail }: RepoTableRowProps) {
  const { repo, localState } = data;
  const router = useRouter();

  const isCloned = !!localState?.clonePath;
  const isOutdated = isCloned && localState?.localVersion && repo.lastReleaseVersion &&
    localState.localTag !== repo.lastReleaseVersion;
  const isRunning = localState?.processStatus === 'running';

  // Local status
  let localStatusText = '— Not cloned';
  let localStatusColor = '#484f58';
  if (isRunning) {
    localStatusText = '● Running';
    localStatusColor = '#3fb950';
  } else if (isCloned && isOutdated) {
    localStatusText = '⚠ Outdated';
    localStatusColor = '#f85149';
  } else if (isCloned) {
    localStatusText = '✓ Up to date';
    localStatusColor = '#3fb950';
  }

  // Version display
  let versionDisplay = '—';
  if (isCloned && localState?.localTag && repo.lastReleaseVersion) {
    if (localState.localTag === repo.lastReleaseVersion) {
      versionDisplay = `${localState.localTag} ✓`;
    } else {
      versionDisplay = `${localState.localTag} → ${repo.lastReleaseVersion}`;
    }
  } else if (isCloned && localState?.localVersion) {
    versionDisplay = localState.localVersion.substring(0, 7);
  } else if (repo.lastReleaseVersion) {
    versionDisplay = `Latest: ${repo.lastReleaseVersion}`;
  }

  // Disk usage
  const diskDisplay = localState?.diskUsageBytes
    ? formatBytes(localState.diskUsageBytes)
    : '—';

  // Last activity
  const activityDisplay = repo.lastCommitAt
    ? timeAgo(new Date(repo.lastCommitAt))
    : '—';

  // Primary action
  async function handlePrimaryAction() {
    if (!isCloned) {
      await fetch('/api/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: repo.owner, name: repo.name }),
      });
      router.refresh();
    } else if (isOutdated) {
      await fetch('/api/update-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: repo.owner, name: repo.name }),
      });
      router.refresh();
    } else if (isRunning) {
      await fetch('/api/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: repo.owner, name: repo.name }),
      });
      router.refresh();
    } else {
      await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: repo.owner, name: repo.name }),
      });
      router.refresh();
    }
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
      style={{ gridTemplateColumns: '28px 2fr 110px 110px 130px 90px 70px 70px 160px' }}
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

      <div className="py-2 min-w-0">
        <button
          onClick={() => onOpenDetail(repo.owner, repo.name)}
          className="text-[#58a6ff] font-semibold hover:underline text-left truncate block"
        >
          {repo.fullName}
        </button>
        <span className="text-[10px] text-[#8b949e] block truncate">
          {WATCH_ICONS[repo.watchLevel] || ''} {repo.watchLevel.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="py-2">
        <StageDropdown repoId={repo.id} currentStage={repo.workflowStage} />
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

      <div className="py-2 flex gap-1">
        <button
          onClick={handlePrimaryAction}
          className={`text-[10px] px-2 py-0.5 rounded text-white ${primaryColor}`}
        >
          {primaryLabel}
        </button>
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
