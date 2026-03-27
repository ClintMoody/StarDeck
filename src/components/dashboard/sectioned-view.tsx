"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InferSelectModel } from "drizzle-orm";
import type { starredRepos, repoLocalState } from "@/lib/db/schema";
import { SlideOutPanel } from "@/components/slide-out-panel";

type Repo = InferSelectModel<typeof starredRepos>;
type LocalState = InferSelectModel<typeof repoLocalState>;

export interface RepoSection {
  id: string;
  title: string;
  icon: string;
  repos: Repo[];
  type: "status" | "recent" | "category";
  emptyMessage?: string;
}

interface SectionedViewProps {
  sections: RepoSection[];
  localStateMap: Record<number, LocalState>;
}

export function SectionedView({ sections, localStateMap }: SectionedViewProps) {
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const router = useRouter();

  function toggleExpand(sectionId: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  // Hide empty category sections, but show empty status sections as a thin bar
  const visibleSections = sections.filter(
    (s) => s.type !== "category" || s.repos.length > 0
  );

  return (
    <>
      <div className="space-y-6">
        {visibleSections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const previewCount = section.type === "category" ? 4 : 6;
          const displayRepos = isExpanded ? section.repos : section.repos.slice(0, previewCount);
          const hiddenCount = section.repos.length - previewCount;

          // Status sections with no repos: minimal one-liner
          if (section.type === "status" && section.repos.length === 0) {
            return (
              <div key={section.id} className="flex items-center gap-2 text-sm text-gray-600 py-1">
                <span>{section.icon}</span>
                <span>{section.emptyMessage ?? `No ${section.title.toLowerCase()}`}</span>
              </div>
            );
          }

          return (
            <div key={section.id}>
              {/* Section Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span>{section.icon}</span>
                  <h2 className={`text-sm font-semibold uppercase tracking-wider ${
                    section.type === "status" ? "text-green-400" :
                    section.type === "recent" ? "text-amber-400" :
                    "text-gray-400"
                  }`}>
                    {section.title}
                  </h2>
                  <span className="text-xs text-gray-600 bg-gray-800/50 px-1.5 py-0.5 rounded-full">
                    {section.repos.length}
                  </span>
                </div>
                {hiddenCount > 0 && (
                  <button
                    onClick={() => toggleExpand(section.id)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {isExpanded ? "Show less" : `+${hiddenCount} more`}
                  </button>
                )}
              </div>

              {/* Cards */}
              {section.type === "category" ? (
                // Compact row for categories
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  {displayRepos.map((repo) => (
                    <CompactCard
                      key={repo.id}
                      repo={repo}
                      status={localStateMap[repo.id]?.processStatus ?? undefined}
                      onClick={() => setSelectedRepo(repo)}
                    />
                  ))}
                  {!isExpanded && hiddenCount > 0 && (
                    <button
                      onClick={() => toggleExpand(section.id)}
                      className="bg-gray-900/20 border border-gray-800/40 border-dashed rounded-lg py-3 flex items-center justify-center hover:border-blue-800/50 transition-all text-sm text-gray-600 hover:text-blue-400"
                    >
                      +{hiddenCount} more
                    </button>
                  )}
                </div>
              ) : (
                // Full cards for status/recent sections
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {displayRepos.map((repo) => (
                    <FullCard
                      key={repo.id}
                      repo={repo}
                      status={localStateMap[repo.id]?.processStatus ?? undefined}
                      onClick={() => setSelectedRepo(repo)}
                    />
                  ))}
                  {!isExpanded && hiddenCount > 0 && (
                    <button
                      onClick={() => toggleExpand(section.id)}
                      className="bg-gray-900/20 border border-gray-800/40 border-dashed rounded-lg py-6 flex items-center justify-center hover:border-blue-800/50 transition-all text-sm text-gray-600 hover:text-blue-400"
                    >
                      +{hiddenCount} more
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

/** Compact card for category sections — name, language, stars, one-line desc */
function CompactCard({ repo, status, onClick }: { repo: Repo; status?: string; onClick: () => void }) {
  const LANG_COLORS: Record<string, string> = {
    TypeScript: "bg-blue-500", JavaScript: "bg-yellow-400", Python: "bg-green-500",
    Rust: "bg-orange-500", Go: "bg-cyan-400", "C++": "bg-pink-500",
    Shell: "bg-emerald-500", HTML: "bg-orange-600", Dart: "bg-sky-400",
    Java: "bg-red-500", "Objective-C": "bg-blue-400",
  };

  return (
    <div
      onClick={onClick}
      className="bg-gray-900/60 border border-gray-800/60 rounded-lg px-3 py-2.5 hover:border-blue-700/50 hover:bg-gray-900 transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-2 mb-1">
        {repo.language && (
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${LANG_COLORS[repo.language] ?? "bg-gray-500"}`} />
        )}
        <span className="text-sm text-blue-400 group-hover:text-blue-300 font-medium truncate">
          {repo.name}
        </span>
        {status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />}
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="text-yellow-500/70">&#9733; {repo.starCount?.toLocaleString()}</span>
        <span className="truncate text-gray-600">{repo.owner}</span>
      </div>
    </div>
  );
}

/** Full card for status/recent sections — includes description and topics */
function FullCard({ repo, status, onClick }: { repo: Repo; status?: string; onClick: () => void }) {
  const topics: string[] = repo.topics ? JSON.parse(repo.topics) : [];
  const LANG_COLORS: Record<string, string> = {
    TypeScript: "bg-blue-500", JavaScript: "bg-yellow-400", Python: "bg-green-500",
    Rust: "bg-orange-500", Go: "bg-cyan-400", "C++": "bg-pink-500",
    Shell: "bg-emerald-500", HTML: "bg-orange-600", Dart: "bg-sky-400",
    Java: "bg-red-500", "Objective-C": "bg-blue-400",
  };

  return (
    <div
      onClick={onClick}
      className="bg-gray-900/80 border border-gray-800 rounded-lg p-4 hover:border-blue-700/50 hover:bg-gray-900 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-blue-400 group-hover:text-blue-300 font-medium text-sm truncate">
          {repo.fullName}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {status === "running" && (
            <span className="text-xs bg-green-900/40 text-green-400 px-1.5 py-0.5 rounded-full">running</span>
          )}
          {repo.language && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <span className={`w-2 h-2 rounded-full ${LANG_COLORS[repo.language] ?? "bg-gray-500"}`} />
              {repo.language}
            </span>
          )}
        </div>
      </div>

      {repo.description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{repo.description}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-600">
        <span className="text-yellow-500/70">&#9733; {repo.starCount?.toLocaleString()}</span>
        {repo.forkCount ? <span>&#9741; {repo.forkCount?.toLocaleString()}</span> : null}
      </div>

      {topics.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {topics.slice(0, 3).map((t) => (
            <span key={t} className="text-xs bg-indigo-900/20 text-indigo-400/70 px-1.5 py-0.5 rounded-full">{t}</span>
          ))}
          {topics.length > 3 && <span className="text-xs text-gray-700">+{topics.length - 3}</span>}
        </div>
      )}
    </div>
  );
}
