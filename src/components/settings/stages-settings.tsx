'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Stage {
  id: number;
  name: string;
  icon: string;
  color: string;
  position: number;
  deletable: boolean;
}

interface StagesSettingsProps {
  initialStages: Stage[];
}

export function StagesSettings({ initialStages }: StagesSettingsProps) {
  const [stages, setStages] = useState(initialStages);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const router = useRouter();

  async function updateStage(id: number, data: Partial<Stage>) {
    await fetch('/api/workflow-stages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    setStages(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  }

  async function addStage() {
    if (!newName.trim()) return;
    const res = await fetch('/api/workflow-stages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const stage = await res.json();
    setStages(prev => [...prev, stage]);
    setNewName('');
    setAdding(false);
    router.refresh();
  }

  async function removeStage(id: number) {
    const defaultStage = stages.find(s => !s.deletable);
    if (!defaultStage) return;
    if (!confirm('Delete this stage? Repos will be reassigned to the first default stage.')) return;
    await fetch('/api/workflow-stages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, reassignToId: defaultStage.id }),
    });
    setStages(prev => prev.filter(s => s.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Workflow Stages</h2>
      <p className="text-xs text-gray-500">Pipeline stages for tracking your workflow with repos. Default stages can be renamed but not deleted.</p>

      <div className="space-y-1">
        {stages.map(stage => (
          <div key={stage.id} className="flex items-center gap-3 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg">
            <span className="text-lg">{stage.icon}</span>
            <input
              type="text"
              value={stage.name}
              onChange={e => updateStage(stage.id, { name: e.target.value })}
              className="flex-1 bg-transparent text-sm text-gray-300 outline-none border-b border-transparent focus:border-blue-700"
            />
            <input
              type="color"
              value={stage.color}
              onChange={e => updateStage(stage.id, { color: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
            />
            {stage.deletable ? (
              <button
                onClick={() => removeStage(stage.id)}
                className="text-xs text-gray-600 hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            ) : (
              <span className="text-xs text-gray-700">default</span>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addStage()}
            placeholder="Stage name..."
            className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-700"
            autoFocus
          />
          <button onClick={addStage} className="text-sm text-green-400 px-2">Add</button>
          <button onClick={() => setAdding(false)} className="text-sm text-gray-500 px-2">Cancel</button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          + Add Stage
        </button>
      )}
    </div>
  );
}
