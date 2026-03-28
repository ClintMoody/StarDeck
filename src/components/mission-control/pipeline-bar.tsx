'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface PipelineBarProps {
  stageCounts: Record<string, number>;
  totalCount: number;
  activeStage: string | null;
  stages?: { id: number; name: string; icon: string; color: string }[];
}

const FALLBACK_STAGES = [
  { key: null, label: 'All', icon: '' },
  { key: 'watching', label: 'Watching', icon: '\u{1F441}' },
  { key: 'want_to_try', label: 'Want to Try', icon: '\u{1F9EA}' },
  { key: 'downloaded', label: 'Downloaded', icon: '\u{1F4E6}' },
  { key: 'active', label: 'Active', icon: '\u{1F680}' },
  { key: 'archived', label: 'Archived', icon: '\u{1F4C1}' },
];

export function PipelineBar({ stageCounts, totalCount, activeStage, stages }: PipelineBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleStageClick(stageKey: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (stageKey) {
      params.set('stage', stageKey);
    } else {
      params.delete('stage');
    }
    router.push(`/mission-control?${params.toString()}`);
  }

  // Build display stages from DB stages if available, otherwise use fallback
  const displayStages: { key: string | null; label: string; icon: string }[] = stages && stages.length > 0
    ? [
        { key: null, label: 'All', icon: '' },
        ...stages.map(s => ({
          key: s.name.toLowerCase().replace(/\s+/g, '_'),
          label: s.name,
          icon: s.icon,
        })),
      ]
    : FALLBACK_STAGES;

  return (
    <div className="flex gap-0.5 px-5 py-3 bg-[#0d1117] border-b border-[#21262d]">
      {displayStages.map((stage) => {
        const count = stage.key === null ? totalCount : (stageCounts[stage.key] || 0);
        const isActive = activeStage === stage.key;

        return (
          <button
            key={stage.key ?? 'all'}
            onClick={() => handleStageClick(stage.key)}
            className={`
              flex-1 text-center py-2 px-3 rounded-md text-xs font-semibold transition-colors
              ${isActive
                ? 'bg-[#1f6feb22] border border-[#1f6feb] text-[#58a6ff]'
                : 'bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] border border-transparent'
              }
            `}
          >
            {stage.icon} {stage.label}
            <span className={`
              ml-1 text-[10px] px-1.5 py-0.5 rounded-full
              ${isActive ? 'bg-[#1f6feb] text-white' : 'opacity-60'}
            `}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
