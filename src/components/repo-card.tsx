import type { InferSelectModel } from "drizzle-orm";
import type { starredRepos } from "@/lib/db/schema";

type Repo = InferSelectModel<typeof starredRepos>;

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "bg-blue-500",
  JavaScript: "bg-yellow-400",
  Python: "bg-green-500",
  Rust: "bg-orange-500",
  Go: "bg-cyan-400",
  "C++": "bg-pink-500",
  C: "bg-gray-400",
  Java: "bg-red-500",
  Ruby: "bg-red-400",
  Swift: "bg-orange-400",
  Kotlin: "bg-purple-400",
  Dart: "bg-sky-400",
  Shell: "bg-emerald-500",
  HTML: "bg-orange-600",
  CSS: "bg-indigo-400",
  Lua: "bg-blue-700",
  "Objective-C": "bg-blue-400",
  "Jupyter Notebook": "bg-orange-300",
};

export function RepoCard({ repo, onClick, status, selected, onSelect }: {
  repo: Repo;
  onClick?: () => void;
  status?: string;
  selected?: boolean;
  onSelect?: (id: number, checked: boolean) => void;
}) {
  const topics: string[] = repo.topics ? JSON.parse(repo.topics) : [];
  const langColor = repo.language ? LANGUAGE_COLORS[repo.language] ?? "bg-gray-500" : null;

  return (
    <div
      className={`bg-gray-900/80 border rounded-lg p-4 hover:border-blue-700/50 hover:bg-gray-900 transition-all group cursor-pointer relative ${
        selected ? "border-blue-600 bg-blue-900/10" : "border-gray-800"
      } ${onSelect ? "pl-8" : ""}`}
      onClick={onClick}
    >
      {onSelect && (
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
          style={selected ? { opacity: 1 } : {}}
        >
          <input
            type="checkbox"
            checked={selected ?? false}
            onChange={(e) => { e.stopPropagation(); onSelect(repo.id, e.target.checked); }}
            className="w-4 h-4 accent-blue-500"
          />
        </div>
      )}
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <a
            href={`https://github.com/${repo.fullName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 hover:underline font-medium transition-colors"
          >
            {repo.fullName}
          </a>
        </div>
        {repo.language && (
          <span className="flex items-center gap-1.5 text-xs text-gray-300 bg-gray-800/80 px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
            {langColor && <span className={`w-2 h-2 rounded-full ${langColor}`} />}
            {repo.language}
          </span>
        )}
        {status && status !== "stopped" && (
          <span className={`text-xs px-2 py-0.5 rounded-full ml-1 flex-shrink-0 ${
            status === "running" ? "bg-green-900/40 text-green-400" :
            status === "installing" ? "bg-blue-900/40 text-blue-400" :
            status === "error" ? "bg-red-900/40 text-red-400" :
            "bg-gray-800 text-gray-400"
          }`}>
            {status === "running" ? "● Running" :
             status === "installing" ? "● Installing" :
             status === "error" ? "● Error" :
             status}
          </span>
        )}
      </div>

      {repo.description && (
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">
          {repo.description}
        </p>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="text-yellow-500">&#9733;</span>
          {repo.starCount?.toLocaleString()}
        </span>
        {repo.forkCount ? (
          <span className="flex items-center gap-1">
            <span className="text-gray-400">&#9741;</span>
            {repo.forkCount.toLocaleString()}
          </span>
        ) : null}
        {repo.lastCommitAt && (
          <span>
            Updated{" "}
            {new Date(repo.lastCommitAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {topics.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {topics.slice(0, 5).map((topic) => (
            <span
              key={topic}
              className="text-xs bg-indigo-900/30 text-indigo-300 border border-indigo-800/30 px-2 py-0.5 rounded-full"
            >
              {topic}
            </span>
          ))}
          {topics.length > 5 && (
            <span className="text-xs text-gray-600 px-1 py-0.5">
              +{topics.length - 5}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
