'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface StageDropdownProps {
  repoId: number;
  currentStageId: number | null;
  stages: { id: number; name: string; icon: string; color: string }[];
}

export function StageDropdown({ repoId, currentStageId, stages }: StageDropdownProps) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (adding && inputRef.current) inputRef.current.focus();
  }, [adding]);

  const current = stages.find(s => s.id === currentStageId);

  async function changeStage(stageId: number) {
    setOpen(false);
    await fetch('/api/workflow-stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoIds: [repoId], stageId }),
    });
    router.refresh();
  }

  async function addStage() {
    const name = newName.trim();
    if (!name) return;
    setAdding(false);
    setNewName('');
    await fetch('/api/workflow-stages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    router.refresh();
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="text-[11px] px-2 py-0.5 rounded-full border border-[#30363d] hover:border-[#8b949e] transition-colors"
        style={{ color: current?.color ?? '#484f58' }}
      >
        {current ? `${current.icon} ${current.name}` : '—'}
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-[#161b22] border border-[#30363d] rounded-lg shadow-lg py-1 min-w-[160px]">
          {stages.map(stage => (
            <button
              key={stage.id}
              onClick={() => changeStage(stage.id)}
              className={`
                block w-full text-left px-3 py-1.5 text-xs hover:bg-[#21262d] transition-colors
                ${stage.id === currentStageId ? 'text-[#f0f6fc] font-semibold' : 'text-[#8b949e]'}
              `}
            >
              {stage.icon} {stage.name}
              {stage.id === currentStageId && ' \u2713'}
            </button>
          ))}

          <div className="border-t border-[#21262d] mt-1 pt-1">
            {adding ? (
              <div className="px-3 py-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') addStage();
                    if (e.key === 'Escape') { setAdding(false); setNewName(''); }
                  }}
                  placeholder="Stage name..."
                  className="w-full bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] px-2 py-1 rounded text-xs"
                />
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="block w-full text-left px-3 py-1.5 text-xs text-[#58a6ff] hover:bg-[#21262d] transition-colors"
              >
                + Add Stage
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
