interface Release {
  id: number;
  version: string;
  name: string | null;
  publishedAt: string | null;
  changelog: string | null;
  seen: boolean | null;
}

export function ReleasesView({ releases }: { releases: Release[] }) {
  if (releases.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">No releases tracked yet</p>
        <p className="text-gray-600 text-sm mt-1">Releases will appear here after the next sync</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {releases.map((release) => (
        <div key={release.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-100">
              {release.name ?? release.version}
            </h3>
            <span className="text-xs text-gray-500">
              {release.publishedAt ? new Date(release.publishedAt).toLocaleDateString() : ""}
            </span>
          </div>
          <span className="text-xs bg-green-900/30 text-green-400 border border-green-800/30 px-2 py-0.5 rounded-full">
            {release.version}
          </span>
          {release.changelog && (
            <p className="text-sm text-gray-400 mt-3 line-clamp-4 whitespace-pre-wrap">
              {release.changelog}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
