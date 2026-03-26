interface ActivityItemProps {
  type: string;
  repoName: string;
  title: string | null;
  detail: string | null;
  date: string | null;
}

export function ActivityItem({ type, repoName, title, detail, date }: ActivityItemProps) {
  const timeAgo = date ? formatTimeAgo(date) : "";

  const typeStyles: Record<string, { color: string; label: string }> = {
    release: { color: "text-green-400", label: "Release" },
    security: { color: "text-red-400", label: "Security" },
    behind: { color: "text-amber-400", label: "Behind" },
  };

  const style = typeStyles[type] ?? { color: "text-gray-400", label: type };

  return (
    <div className="py-2 border-l-2 border-gray-800 pl-3 ml-2">
      <div className="flex items-center gap-2 mb-0.5">
        <span className={`text-xs font-medium ${style.color}`}>
          {style.label}
        </span>
        <span className="text-xs text-gray-600">{timeAgo}</span>
      </div>
      <div className="text-sm text-gray-300">{repoName}</div>
      {title && (
        <div className="text-xs text-gray-500 mt-0.5">{title}</div>
      )}
      {detail && type === "release" && (
        <div className="text-xs text-gray-600 mt-0.5">{detail}</div>
      )}
      {detail && type === "security" && (
        <div className={`text-xs mt-0.5 ${
          detail === "critical" || detail === "high" ? "text-red-500" : "text-amber-500"
        }`}>
          Severity: {detail}
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
