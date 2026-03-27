'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { MissionControlFilters } from '@/lib/queries';

interface Collection {
  id: number;
  name: string;
  color: string;
  count: number;
}

interface SavedView {
  id: number;
  name: string;
  filters: string;
  builtIn: boolean;
}

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface MCSidebarProps {
  collections: Collection[];
  savedViews: SavedView[];
  tags: Tag[];
  activeFilters: MissionControlFilters;
}

export function MCSidebar({ collections, savedViews, tags, activeFilters }: MCSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showNewCollection, setShowNewCollection] = useState(false);

  function navigateWithFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/mission-control?${params.toString()}`);
  }

  function applySavedView(filtersJson: string) {
    const filters = JSON.parse(filtersJson);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value));
    });
    router.push(`/mission-control?${params.toString()}`);
  }

  async function createNewCollection() {
    if (!newCollectionName.trim()) return;
    await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCollectionName.trim() }),
    });
    setNewCollectionName('');
    setShowNewCollection(false);
    router.refresh();
  }

  return (
    <aside className="w-52 border-r border-[#21262d] p-4 text-xs flex-shrink-0">
      {/* Saved Views */}
      {savedViews.length > 0 && (
        <div className="mb-4">
          <div className="text-[#8b949e] font-semibold uppercase text-[10px] mb-2">Saved Views</div>
          {savedViews.map(view => (
            <button
              key={view.id}
              onClick={() => applySavedView(view.filters)}
              className="block w-full text-left text-[#8b949e] hover:text-[#c9d1d9] px-2 py-1 rounded hover:bg-[#21262d] transition-colors"
            >
              {view.name}
            </button>
          ))}
        </div>
      )}

      {/* Collections */}
      <div className="mb-4">
        <div className="text-[#8b949e] font-semibold uppercase text-[10px] mb-2">Collections</div>
        <button
          onClick={() => navigateWithFilter('collectionId', null)}
          className={`block w-full text-left px-2 py-1 rounded transition-colors ${
            !activeFilters.collectionId ? 'text-[#c9d1d9] bg-[#1f6feb22]' : 'text-[#8b949e] hover:text-[#c9d1d9]'
          }`}
        >
          All Repos
        </button>
        {collections.map(c => (
          <button
            key={c.id}
            onClick={() => navigateWithFilter('collectionId', String(c.id))}
            className={`block w-full text-left px-2 py-1 rounded transition-colors ${
              activeFilters.collectionId === c.id ? 'text-[#c9d1d9] bg-[#1f6feb22]' : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <span style={{ color: c.color }}>●</span> {c.name}
            <span className="float-right opacity-50">{c.count}</span>
          </button>
        ))}
        {showNewCollection ? (
          <div className="flex gap-1 mt-1">
            <input
              type="text"
              value={newCollectionName}
              onChange={e => setNewCollectionName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createNewCollection()}
              placeholder="Name..."
              className="flex-1 bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] px-2 py-1 rounded text-xs"
              autoFocus
            />
            <button onClick={createNewCollection} className="text-[#3fb950] px-1">✓</button>
            <button onClick={() => setShowNewCollection(false)} className="text-[#f85149] px-1">✗</button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewCollection(true)}
            className="block w-full text-left text-[#8b949e] hover:text-[#c9d1d9] px-2 py-1"
          >
            + New Collection
          </button>
        )}
      </div>

      {/* Watch Level */}
      <div className="mb-4">
        <div className="text-[#8b949e] font-semibold uppercase text-[10px] mb-2">Watch Level</div>
        {[
          { key: 'releases_only', label: '🔕 Releases Only' },
          { key: 'active_tracking', label: '📡 Active Tracking' },
          { key: 'full_watch', label: '📺 Full Watch' },
        ].map(level => (
          <button
            key={level.key}
            onClick={() => navigateWithFilter('watchLevel', activeFilters.watchLevel === level.key ? null : level.key)}
            className={`block w-full text-left px-2 py-1 rounded transition-colors ${
              activeFilters.watchLevel === level.key ? 'text-[#c9d1d9] bg-[#1f6feb22]' : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            {level.label}
          </button>
        ))}
      </div>

      {/* Quick Filters */}
      <div className="mb-4">
        <div className="text-[#8b949e] font-semibold uppercase text-[10px] mb-2">Filters</div>
        <button
          onClick={() => navigateWithFilter('localStatus', activeFilters.localStatus === 'outdated' ? null : 'outdated')}
          className="block w-full text-left text-[#8b949e] hover:text-[#c9d1d9] px-2 py-1 rounded hover:bg-[#21262d]"
        >
          ⚠️ Updates Available
        </button>
        <button
          onClick={() => navigateWithFilter('localStatus', activeFilters.localStatus === 'vulnerable' ? null : 'vulnerable')}
          className="block w-full text-left text-[#8b949e] hover:text-[#c9d1d9] px-2 py-1 rounded hover:bg-[#21262d]"
        >
          🔒 Security Alerts
        </button>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <div className="text-[#8b949e] font-semibold uppercase text-[10px] mb-2">Tags</div>
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => navigateWithFilter('tagId', activeFilters.tagId === tag.id ? null : String(tag.id))}
              className={`block w-full text-left px-2 py-1 rounded transition-colors ${
                activeFilters.tagId === tag.id ? 'text-[#c9d1d9] bg-[#1f6feb22]' : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              <span style={{ color: tag.color }}>●</span> {tag.name}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
