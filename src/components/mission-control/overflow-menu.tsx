'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface OverflowMenuProps {
  repoId: number;
  owner: string;
  name: string;
  fullName: string;
  currentStage: string;
  currentWatchLevel: string;
  isCloned: boolean;
}

const STAGES = [
  { key: 'watching', label: 'Watching', icon: '👁' },
  { key: 'want_to_try', label: 'Want to Try', icon: '🧪' },
  { key: 'downloaded', label: 'Downloaded', icon: '📦' },
  { key: 'active', label: 'Active', icon: '🚀' },
  { key: 'archived', label: 'Archived', icon: '📁' },
];

const WATCH_LEVELS = [
  { key: 'releases_only', label: 'Releases Only', icon: '🔕' },
  { key: 'active_tracking', label: 'Active Tracking', icon: '📡' },
  { key: 'full_watch', label: 'Full Watch', icon: '📺' },
];

export function OverflowMenu({ repoId, owner, name, fullName, currentStage, currentWatchLevel, isCloned }: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const [subMenu, setSubMenu] = useState<'stage' | 'watch' | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSubMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function changeStage(stage: string) {
    await fetch('/api/workflow-stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoIds: [repoId], stage }),
    });
    close();
    router.refresh();
  }

  async function changeWatchLevel(level: string) {
    await fetch('/api/watch-level', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoIds: [repoId], level }),
    });
    close();
    router.refresh();
  }

  async function deleteClone() {
    if (!confirm(`Delete local clone of ${fullName}?`)) return;
    await fetch('/api/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-clones', repoIds: [repoId] }),
    });
    close();
    router.refresh();
  }

  function close() {
    setOpen(false);
    setSubMenu(null);
  }

  function viewOnGitHub() {
    window.open(`https://github.com/${fullName}`, '_blank');
    close();
  }

  function copyCloneUrl() {
    navigator.clipboard.writeText(`https://github.com/${fullName}.git`);
    close();
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); setSubMenu(null); }}
        className="text-[10px] px-1.5 py-0.5 rounded bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#30363d] transition-colors"
      >
        ▾
      </button>

      {open && (
        <div className="absolute z-50 right-0 top-full mt-1 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl py-1 min-w-[200px] text-xs">
          {/* Move to stage */}
          <div className="relative">
            <button
              onClick={() => setSubMenu(subMenu === 'stage' ? null : 'stage')}
              className="w-full text-left px-3 py-1.5 text-[#c9d1d9] hover:bg-[#21262d] flex items-center justify-between"
            >
              Move to stage <span className="text-[#484f58]">›</span>
            </button>
            {subMenu === 'stage' && (
              <div className="absolute left-full top-0 ml-1 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl py-1 min-w-[160px]">
                {STAGES.map(s => (
                  <button
                    key={s.key}
                    onClick={() => changeStage(s.key)}
                    className={`w-full text-left px-3 py-1.5 hover:bg-[#21262d] ${s.key === currentStage ? 'text-[#f0f6fc] font-semibold' : 'text-[#8b949e]'}`}
                  >
                    {s.icon} {s.label} {s.key === currentStage && '✓'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Change watch level */}
          <div className="relative">
            <button
              onClick={() => setSubMenu(subMenu === 'watch' ? null : 'watch')}
              className="w-full text-left px-3 py-1.5 text-[#c9d1d9] hover:bg-[#21262d] flex items-center justify-between"
            >
              Watch level <span className="text-[#484f58]">›</span>
            </button>
            {subMenu === 'watch' && (
              <div className="absolute left-full top-0 ml-1 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl py-1 min-w-[160px]">
                {WATCH_LEVELS.map(l => (
                  <button
                    key={l.key}
                    onClick={() => changeWatchLevel(l.key)}
                    className={`w-full text-left px-3 py-1.5 hover:bg-[#21262d] ${l.key === currentWatchLevel ? 'text-[#f0f6fc] font-semibold' : 'text-[#8b949e]'}`}
                  >
                    {l.icon} {l.label} {l.key === currentWatchLevel && '✓'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[#21262d] my-1" />

          <button onClick={viewOnGitHub} className="w-full text-left px-3 py-1.5 text-[#c9d1d9] hover:bg-[#21262d]">
            View on GitHub
          </button>
          <button onClick={copyCloneUrl} className="w-full text-left px-3 py-1.5 text-[#c9d1d9] hover:bg-[#21262d]">
            Copy clone URL
          </button>
          <button
            onClick={() => { window.open(`/repo/${owner}/${name}`, '_self'); close(); }}
            className="w-full text-left px-3 py-1.5 text-[#c9d1d9] hover:bg-[#21262d]"
          >
            View details
          </button>

          {isCloned && (
            <>
              <div className="border-t border-[#21262d] my-1" />
              <button onClick={deleteClone} className="w-full text-left px-3 py-1.5 text-[#f85149] hover:bg-[#21262d]">
                Delete local clone
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
