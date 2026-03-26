"use client";

import { useState } from "react";
import type { InferSelectModel } from "drizzle-orm";
import type { starredRepos, repoLocalState } from "@/lib/db/schema";
import { RepoCard } from "@/components/repo-card";
import { SlideOutPanel } from "@/components/slide-out-panel";

type Repo = InferSelectModel<typeof starredRepos>;
type LocalState = InferSelectModel<typeof repoLocalState>;

export interface RepoSection {
  id: string;
  title: string;
  icon: string;
  repos: Repo[];
  priority: "high" | "normal";
  emptyMessage?: string;
}

interface SectionedViewProps {
  sections: RepoSection[];
  localStateMap: Record<number, LocalState>;
}

export function SectionedView({ sections, localStateMap }: SectionedViewProps) {
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  function toggleExpand(sectionId: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  // Filter out empty normal-priority sections
  const visibleSections = sections.filter(
    (s) => s.priority === "high" || s.repos.length > 0
  );

  return (
    <>
      <div className="space-y-8">
        {visibleSections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const previewCount = section.priority === "high" ? 6 : 4;
          const displayRepos = isExpanded ? section.repos : section.repos.slice(0, previewCount);
          const hiddenCount = section.repos.length - previewCount;

          return (
            <div key={section.id}>
              {/* Section Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{section.icon}</span>
                  <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                    {section.title}
                  </h2>
                  <span className="text-xs text-gray-600 bg-gray-800/50 px-2 py-0.5 rounded-full">
                    {section.repos.length}
                  </span>
                </div>
                {section.repos.length > previewCount && (
                  <button
                    onClick={() => toggleExpand(section.id)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {isExpanded ? "Show less" : `See all ${section.repos.length}`}
                  </button>
                )}
              </div>

              {/* Section Content */}
              {section.repos.length === 0 ? (
                <div className="bg-gray-900/30 border border-gray-800/50 border-dashed rounded-lg py-6 px-4 text-center">
                  <p className="text-sm text-gray-600">
                    {section.emptyMessage ?? "No repos in this section"}
                  </p>
                </div>
              ) : (
                <div className={`grid gap-3 ${
                  section.priority === "high"
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                }`}>
                  {displayRepos.map((repo) => (
                    <RepoCard
                      key={repo.id}
                      repo={repo}
                      onClick={() => setSelectedRepo(repo)}
                      status={localStateMap[repo.id]?.processStatus ?? undefined}
                    />
                  ))}

                  {/* "+N more" card */}
                  {!isExpanded && hiddenCount > 0 && (
                    <button
                      onClick={() => toggleExpand(section.id)}
                      className="bg-gray-900/30 border border-gray-800/50 border-dashed rounded-lg p-4 flex items-center justify-center hover:border-blue-800/50 hover:bg-gray-900/50 transition-all cursor-pointer group min-h-[120px]"
                    >
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-600 group-hover:text-blue-400 transition-colors">
                          +{hiddenCount}
                        </div>
                        <div className="text-xs text-gray-600 group-hover:text-gray-400 mt-1">
                          more repos
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedRepo && (
        <SlideOutPanel
          repo={selectedRepo}
          onClose={() => setSelectedRepo(null)}
        />
      )}
    </>
  );
}
