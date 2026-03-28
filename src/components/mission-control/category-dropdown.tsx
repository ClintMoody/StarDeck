'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CategoryDropdownProps {
  repoId: number;
  currentCategoryId: number | null;
  isAuto: boolean;
  categories: { id: number; name: string; icon: string; color: string }[];
}

export function CategoryDropdown({ repoId, currentCategoryId, isAuto, categories }: CategoryDropdownProps) {
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

  const current = categories.find(c => c.id === currentCategoryId);

  async function changeCategory(categoryId: number) {
    setOpen(false);
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
        className="text-[11px] px-2 py-0.5 rounded-full border border-[#30363d] hover:border-[#8b949e] transition-colors"
        style={{ color: current?.color ?? '#484f58' }}
      >
        {current ? `${current.icon} ${current.name}` : '\u2014'}
        {isAuto && current && <span className="ml-1 opacity-40 text-[9px]">auto</span>}
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-[#161b22] border border-[#30363d] rounded-lg shadow-lg py-1 min-w-[180px]">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => changeCategory(cat.id)}
              className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[#21262d] transition-colors ${
                cat.id === currentCategoryId ? 'text-[#f0f6fc] font-semibold' : 'text-[#8b949e]'
              }`}
            >
              {cat.icon} {cat.name}
              {cat.id === currentCategoryId && ' \u2713'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
