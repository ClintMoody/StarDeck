'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const STAGES = [
  { key: 'watching', label: 'Watching', icon: '👁', color: '#8b949e' },
  { key: 'want_to_try', label: 'Want to Try', icon: '🧪', color: '#d2a8ff' },
  { key: 'downloaded', label: 'Downloaded', icon: '📦', color: '#58a6ff' },
  { key: 'active', label: 'Active', icon: '🚀', color: '#f0883e' },
  { key: 'archived', label: 'Archived', icon: '📁', color: '#484f58' },
];

interface StageDropdownProps {
  repoId: number;
  currentStage: string;
}

export function StageDropdown({ repoId, currentStage }: StageDropdownProps) {
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

  const current = STAGES.find(s => s.key === currentStage) || STAGES[0];

  async function changeStage(newStage: string) {
    setOpen(false);
    await fetch('/api/workflow-stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoIds: [repoId], stage: newStage }),
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
        <div className="absolute z-50 top-full left-0 mt-1 bg-[#161b22] border border-[#30363d] rounded-lg shadow-lg py-1 min-w-[160px]">
          {STAGES.map(stage => (
            <button
              key={stage.key}
              onClick={() => changeStage(stage.key)}
              className={`
                block w-full text-left px-3 py-1.5 text-xs hover:bg-[#21262d] transition-colors
                ${stage.key === currentStage ? 'text-[#f0f6fc] font-semibold' : 'text-[#8b949e]'}
              `}
            >
              {stage.icon} {stage.label}
              {stage.key === currentStage && ' ✓'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
