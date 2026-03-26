"use client";

import { useRouter } from "next/navigation";
import type { InferSelectModel } from "drizzle-orm";
import type { starredRepos } from "@/lib/db/schema";

type Repo = InferSelectModel<typeof starredRepos>;

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "bg-blue-500", JavaScript: "bg-yellow-400", Python: "bg-green-500",
  Rust: "bg-orange-500", Go: "bg-cyan-400", "C++": "bg-pink-500",
  Java: "bg-red-500", Ruby: "bg-red-400", Shell: "bg-emerald-500",
  HTML: "bg-orange-600", Dart: "bg-sky-400",
};

interface SlideOutPanelProps {
  repo: Repo;
  onClose: () => void;
}

export function SlideOutPanel({ repo, onClose }: SlideOutPanelProps) {
  const router = useRouter();
  const topics: string[] = repo.topics ? JSON.parse(repo.topics) : [];
  const langColor = repo.language ? LANGUAGE_COLORS[repo.language] ?? "bg-gray-500" : null;

  function handleOpenDetails() {
    router.push(`/repo/${repo.owner}/${repo.name}`);
  }

  return (
    <div className="fixed inset-0 z-30" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="absolute right-0 top-0 bottom-0 w-96 bg-gray-950 border-l border-gray-800 shadow-2xl overflow-y-auto animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800 p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-gray-100 truncate">{repo.fullName}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 ml-2 text-xl leading-none"
            >
              &times;
            </button>
          </div>
          <div className="flex items-center gap-2 mb-3">
            {repo.language && (
              <span className="flex items-center gap-1.5 text-xs text-gray-300 bg-gray-800 px-2 py-0.5 rounded-full">
                {langColor && <span className={`w-2 h-2 rounded-full ${langColor}`} />}
                {repo.language}
              </span>
            )}
            <span className="text-xs text-yellow-500">&#9733; {repo.starCount?.toLocaleString()}</span>
            {repo.forkCount ? <span className="text-xs text-gray-500">&#9741; {repo.forkCount?.toLocaleString()}</span> : null}
          </div>
          <a
            href={`https://github.com/${repo.fullName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
            View on GitHub
          </a>
        </div>

        {/* Description */}
        <div className="p-4 space-y-4">
          {repo.description && (
            <p className="text-sm text-gray-400">{repo.description}</p>
          )}

          {/* Topics */}
          {topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {topics.map((topic) => (
                <span key={topic} className="text-xs bg-indigo-900/30 text-indigo-300 border border-indigo-800/30 px-2 py-0.5 rounded-full">
                  {topic}
                </span>
              ))}
            </div>
          )}

          {/* Info Grid */}
          <div className="bg-gray-900 rounded-lg p-3 space-y-2 text-sm">
            {repo.lastCommitAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Last commit</span>
                <span className="text-gray-300">{new Date(repo.lastCommitAt).toLocaleDateString()}</span>
              </div>
            )}
            {repo.lastReleaseVersion && (
              <div className="flex justify-between">
                <span className="text-gray-500">Latest release</span>
                <span className="text-gray-300">{repo.lastReleaseVersion}</span>
              </div>
            )}
            {repo.starredAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Starred</span>
                <span className="text-gray-300">{new Date(repo.starredAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={handleOpenDetails}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Open Details
            </button>
            <a
              href={`https://github.com/${repo.fullName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Open on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
