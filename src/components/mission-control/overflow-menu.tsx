'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface OverflowMenuProps {
  repoId: number;
  owner: string;
  name: string;
  fullName: string;
  isCloned: boolean;
}

export function OverflowMenu({ repoId, owner, name, fullName, isCloned }: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="text-[10px] px-1.5 py-0.5 rounded bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#30363d] transition-colors"
      >
        ▾
      </button>

      {open && (
        <div className="absolute z-50 right-0 top-full mt-1 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl py-1 min-w-[180px] text-xs">
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
