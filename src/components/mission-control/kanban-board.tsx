'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Stage {
  id: number;
  name: string;
  icon: string;
  color: string;
}

interface RepoData {
  repo: {
    id: number;
    owner: string;
    name: string;
    fullName: string;
    description: string | null;
    starCount: number;
    lastCommitAt: string | null;
    workflowStageId: number | null;
    language: string | null;
  };
  localState: {
    clonePath: string | null;
    processStatus: string | null;
  } | null;
}

interface KanbanBoardProps {
  stages: Stage[];
  repos: RepoData[];
}

export function KanbanBoard({ stages, repos }: KanbanBoardProps) {
  const router = useRouter();
  const [dragOverCol, setDragOverCol] = useState<number | null>(null);

  function handleDragStart(e: React.DragEvent, repoId: number) {
    e.dataTransfer.setData('repoId', String(repoId));
    e.dataTransfer.effectAllowed = 'move';
  }

  async function handleDrop(e: React.DragEvent, stageId: number) {
    e.preventDefault();
    setDragOverCol(null);
    const repoId = parseInt(e.dataTransfer.getData('repoId'));
    if (!repoId) return;

    await fetch('/api/workflow-stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoIds: [repoId], stageId }),
    });
    router.refresh();
  }

  function handleDragOver(e: React.DragEvent, stageId: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(stageId);
  }

  // Group repos by stage
  const columns = stages.map(stage => ({
    stage,
    repos: repos.filter(r => r.repo.workflowStageId === stage.id),
  }));

  return (
    <div className="flex gap-3 p-4 overflow-x-auto min-h-[calc(100vh-200px)]">
      {columns.map(({ stage, repos: colRepos }) => (
        <div
          key={stage.id}
          className={`flex-shrink-0 w-72 bg-[#161b22] border rounded-lg flex flex-col transition-colors ${
            dragOverCol === stage.id ? 'border-[#1f6feb] ring-1 ring-[#1f6feb]/30' : 'border-[#21262d]'
          }`}
          onDrop={e => handleDrop(e, stage.id)}
          onDragOver={e => handleDragOver(e, stage.id)}
          onDragLeave={() => setDragOverCol(null)}
        >
          {/* Column header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#21262d]">
            <span>{stage.icon}</span>
            <span className="text-sm font-semibold text-[#c9d1d9]">{stage.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#21262d] text-[#8b949e] ml-auto">
              {colRepos.length}
            </span>
          </div>

          {/* Cards */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {colRepos.length === 0 ? (
              <div className="text-xs text-[#484f58] text-center py-8">
                Drag repos here
              </div>
            ) : (
              colRepos.map(({ repo, localState }) => (
                <div
                  key={repo.id}
                  draggable
                  onDragStart={e => handleDragStart(e, repo.id)}
                  className="bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 cursor-grab active:cursor-grabbing hover:border-[#8b949e] transition-colors group"
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-xs text-[#58a6ff] font-medium truncate group-hover:text-[#79c0ff]">
                      {repo.fullName}
                    </span>
                    {localState?.processStatus === 'running' && (
                      <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                  {repo.description && (
                    <p className="text-[10px] text-[#8b949e] line-clamp-2 mb-1.5">{repo.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-[#484f58]">
                    <span>⭐ {repo.starCount >= 1000 ? `${(repo.starCount / 1000).toFixed(1)}k` : repo.starCount}</span>
                    {repo.language && <span>{repo.language}</span>}
                    {localState?.clonePath && <span className="text-[#3fb950]">cloned</span>}
                    {repo.lastCommitAt && <span>{timeAgo(new Date(repo.lastCommitAt))}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return `${Math.floor(seconds / 604800)}w`;
}
