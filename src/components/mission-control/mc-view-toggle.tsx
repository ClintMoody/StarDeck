'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface MCViewToggleProps {
  currentView: 'table' | 'kanban';
}

export function MCViewToggle({ currentView }: MCViewToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setView(view: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (view === 'table') {
      params.delete('view');
    } else {
      params.set('view', view);
    }
    router.push(`/mission-control?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 px-4 py-3 flex-shrink-0">
      <button
        onClick={() => setView('table')}
        className={`px-2.5 py-1.5 rounded text-xs transition-colors ${
          currentView === 'table'
            ? 'bg-[#21262d] text-[#c9d1d9]'
            : 'text-[#8b949e] hover:text-[#c9d1d9]'
        }`}
        title="Table view"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M0 1.5A1.5 1.5 0 0 1 1.5 0h13A1.5 1.5 0 0 1 16 1.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 14.5zM1.5 1a.5.5 0 0 0-.5.5V5h4V1zM5 6H1v4h4zm1 4h4V6H6zm4-5H6V1h4zm1 1v4h4V6zm0-1h4V1.5a.5.5 0 0 0-.5-.5H11zm0 9h3.5a.5.5 0 0 0 .5-.5V11h-4zm-1 0H6v-4h4zM5 11H1v3.5a.5.5 0 0 0 .5.5H5z"/>
        </svg>
      </button>
      <button
        onClick={() => setView('kanban')}
        className={`px-2.5 py-1.5 rounded text-xs transition-colors ${
          currentView === 'kanban'
            ? 'bg-[#21262d] text-[#c9d1d9]'
            : 'text-[#8b949e] hover:text-[#c9d1d9]'
        }`}
        title="Kanban view"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M13.5 1h-11A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 13.5 1zM2.5 2h11a.5.5 0 0 1 .5.5V4H2V2.5a.5.5 0 0 1 .5-.5zM6 5v10H2.5a.5.5 0 0 1-.5-.5V5zm4 10H7V5h3zm4-.5a.5.5 0 0 1-.5.5H11V5h3z"/>
        </svg>
      </button>
    </div>
  );
}
