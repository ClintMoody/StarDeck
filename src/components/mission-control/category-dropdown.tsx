'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CategoryDropdownProps {
  repoId: number;
  assignedCategoryIds: number[];
  hasManualOverride: boolean;
  categories: { id: number; name: string; icon: string; color: string }[];
}

export function CategoryDropdown({ repoId, assignedCategoryIds, hasManualOverride, categories }: CategoryDropdownProps) {
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

  const assigned = categories.filter(c => assignedCategoryIds.includes(c.id));

  async function toggleCategory(categoryId: number) {
    await fetch('/api/repo-category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoId, categoryId }),
    });
    router.refresh();
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="text-[11px] px-1.5 py-0.5 rounded border border-[#30363d] hover:border-[#8b949e] transition-colors flex items-center gap-1 flex-wrap max-w-[140px]"
      >
        {assigned.length === 0 ? (
          <span className="text-[#484f58]">&mdash;</span>
        ) : assigned.length <= 2 ? (
          assigned.map(c => (
            <span key={c.id} style={{ color: c.color }}>{c.icon} {c.name}</span>
          ))
        ) : (
          <>
            <span style={{ color: assigned[0].color }}>{assigned[0].icon} {assigned[0].name}</span>
            <span className="text-[#484f58]">+{assigned.length - 1}</span>
          </>
        )}
        {!hasManualOverride && assigned.length > 0 && <span className="opacity-40 text-[9px]">auto</span>}
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-[#161b22] border border-[#30363d] rounded-lg shadow-lg py-1 min-w-[200px]">
          {categories.map(cat => {
            const isSelected = assignedCategoryIds.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[#21262d] transition-colors ${
                  isSelected ? 'text-[#f0f6fc]' : 'text-[#8b949e]'
                }`}
              >
                <span className="inline-block w-4">{isSelected ? '✓' : ''}</span>
                {cat.icon} {cat.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
