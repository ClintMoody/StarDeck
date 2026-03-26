import type { InferSelectModel } from "drizzle-orm";
import type { starredRepos } from "@/lib/db/schema";

type Repo = InferSelectModel<typeof starredRepos>;

export function RepoCard({ repo }: { repo: Repo }) {
  const topics: string[] = repo.topics ? JSON.parse(repo.topics) : [];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <a
            href={`https://github.com/${repo.fullName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline font-medium"
          >
            {repo.fullName}
          </a>
        </div>
        {repo.language && (
          <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
            {repo.language}
          </span>
        )}
      </div>

      {repo.description && (
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">
          {repo.description}
        </p>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>&#9733; {repo.starCount?.toLocaleString()}</span>
        {repo.forkCount ? <span>&#9741; {repo.forkCount.toLocaleString()}</span> : null}
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
              className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full"
            >
              {topic}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
