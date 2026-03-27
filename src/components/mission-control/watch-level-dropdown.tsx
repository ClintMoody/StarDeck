'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const WATCH_LEVELS = [
  { key: 'releases_only', label: 'Releases Only', icon: '🔕', color: '#484f58' },
  { key: 'active_tracking', label: 'Active Tracking', icon: '📡', color: '#d29922' },
  { key: 'full_watch', label: 'Full Watch', icon: '📺', color: '#3fb950' },
];

interface WatchLevelDropdownProps {
  repoId: number;
  currentLevel: string;
}

export function WatchLevelDropdown({ repoId, currentLevel }: WatchLevelDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = WATCH_LEVELS.find(l => l.key === currentLevel) || WATCH_LEVELS[0];

  async function changeLevel(newLevel: string) {
    setOpen(false);
    await fetch('/api/watch-level', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoIds: [repoId], level: newLevel }),
    });
    router.refresh();
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="text-[11px] px-2 py-0.5 rounded-full border border-[#30363d] hover:border-[#8b949e] transition-colors"
        style={{ color: current.color }}
      >
        {current.icon} {current.label}
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-[#161b22] border border-[#30363d] rounded-lg shadow-lg py-1 min-w-[170px]">
          {WATCH_LEVELS.map(level => (
            <button
              key={level.key}
              onClick={() => changeLevel(level.key)}
              className={`
                block w-full text-left px-3 py-1.5 text-xs hover:bg-[#21262d] transition-colors
                ${level.key === currentLevel ? 'text-[#f0f6fc] font-semibold' : 'text-[#8b949e]'}
              `}
            >
              {level.icon} {level.label}
              {level.key === currentLevel && ' ✓'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
