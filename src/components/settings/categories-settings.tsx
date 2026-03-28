'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  position: number;
  autoRules: string | null;
}

interface CategoriesSettingsProps {
  initialCategories: Category[];
}

export function CategoriesSettings({ initialCategories }: CategoriesSettingsProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [autoSortResult, setAutoSortResult] = useState<string | null>(null);
  const router = useRouter();

  function getKeywords(cat: Category): string[] {
    if (!cat.autoRules) return [];
    try { return JSON.parse(cat.autoRules).keywords ?? []; } catch { return []; }
  }

  async function updateCategory(id: number, data: Partial<Category>) {
    await fetch('/api/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  }

  async function updateKeywords(id: number, keywordsText: string) {
    const keywords = keywordsText.split(',').map(k => k.trim()).filter(Boolean);
    const autoRules = JSON.stringify({ keywords });
    await updateCategory(id, { autoRules });
  }

  async function addCategory() {
    if (!newName.trim()) return;
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const cat = await res.json();
    setCategories(prev => [...prev, cat]);
    setNewName('');
    setAdding(false);
    router.refresh();
  }

  async function removeCategory(id: number) {
    if (!confirm('Delete this category? Repos will be reassigned to "Other".')) return;
    await fetch('/api/categories', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setCategories(prev => prev.filter(c => c.id !== id));
    router.refresh();
  }

  async function runAutoSort() {
    if (!confirm('Re-run auto-sort? This will re-evaluate all auto-assigned repos. Manual overrides won\'t change.')) return;
    setAutoSortResult('Running...');
    const res = await fetch('/api/repo-category/auto-sort', { method: 'POST' });
    const data = await res.json();
    setAutoSortResult(`Done: ${data.updated} of ${data.total} repos updated`);
    setTimeout(() => setAutoSortResult(null), 5000);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Categories</h2>
          <p className="text-xs text-gray-500">What each repo is. Auto-sort assigns categories by keywords. You can override per-repo.</p>
        </div>
        <div className="flex items-center gap-2">
          {autoSortResult && <span className="text-xs text-green-400">{autoSortResult}</span>}
          <button
            onClick={runAutoSort}
            className="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Re-run Auto-Sort
          </button>
        </div>
      </div>

      <div className="space-y-1">
        {categories.map(cat => {
          const keywords = getKeywords(cat);
          const isExpanded = expandedId === cat.id;
          return (
            <div key={cat.id} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 px-3 py-2">
                <span className="text-lg">{cat.icon}</span>
                <input
                  type="text"
                  value={cat.name}
                  onChange={e => updateCategory(cat.id, { name: e.target.value })}
                  className="flex-1 bg-transparent text-sm text-gray-300 outline-none border-b border-transparent focus:border-blue-700"
                />
                <input
                  type="color"
                  value={cat.color}
                  onChange={e => updateCategory(cat.id, { color: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                />
                <button
                  onClick={() => setExpandedId(isExpanded ? null : cat.id)}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  title="Edit keywords"
                >
                  {keywords.length} keywords {isExpanded ? '\u25B2' : '\u25BC'}
                </button>
                {cat.name !== 'Other' && (
                  <button
                    onClick={() => removeCategory(cat.id)}
                    className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
              {isExpanded && (
                <div className="px-3 py-2 border-t border-gray-800">
                  <label className="text-xs text-gray-500 block mb-1">Auto-sort keywords (comma-separated)</label>
                  <textarea
                    defaultValue={keywords.join(', ')}
                    onBlur={e => updateKeywords(cat.id, e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded px-2 py-1.5 text-xs text-gray-300 font-mono focus:outline-none focus:border-blue-700 resize-y"
                    rows={3}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {adding ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
            placeholder="Category name..."
            className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-700"
            autoFocus
          />
          <button onClick={addCategory} className="text-sm text-green-400 px-2">Add</button>
          <button onClick={() => setAdding(false)} className="text-sm text-gray-500 px-2">Cancel</button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          + Add Category
        </button>
      )}
    </div>
  );
}
