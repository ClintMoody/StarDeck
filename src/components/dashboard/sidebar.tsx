import Link from "next/link";
import type { RepoFilters } from "@/lib/queries";
import { buildFilterUrl } from "@/lib/filters";

interface SidebarProps {
  filters: RepoFilters;
  repoCount: number;
  languages: { language: string | null; count: number }[];
  tags: { id: number; name: string; color: string | null }[];
}

export function Sidebar({ filters, repoCount, languages, tags }: SidebarProps) {
  return (
    <aside className="w-56 flex-shrink-0 border-r border-gray-800 overflow-y-auto p-4 space-y-6">
      {/* Status Filters */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Filter
        </h3>
        <nav className="space-y-1">
          <FilterLink
            href={buildFilterUrl(filters, { status: "all", language: undefined, tagId: undefined })}
            active={!filters.status || filters.status === "all"}
            label="All Stars"
            count={repoCount}
          />
        </nav>
      </div>

      {/* Languages */}
      {languages.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Languages
          </h3>
          <nav className="space-y-1">
            {languages.slice(0, 10).map((lang) => (
              <FilterLink
                key={lang.language}
                href={buildFilterUrl(filters, { language: lang.language ?? undefined })}
                active={filters.language === lang.language}
                label={lang.language ?? "Unknown"}
                count={lang.count}
              />
            ))}
          </nav>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Tags
          </h3>
          <nav className="space-y-1">
            {tags.map((tag) => (
              <FilterLink
                key={tag.id}
                href={buildFilterUrl(filters, { tagId: tag.id })}
                active={filters.tagId === tag.id}
                label={tag.name}
                color={tag.color ?? undefined}
              />
            ))}
          </nav>
        </div>
      )}

      {/* Sort */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Sort By
        </h3>
        <nav className="space-y-1">
          <FilterLink
            href={buildFilterUrl(filters, { sort: "starred" })}
            active={!filters.sort || filters.sort === "starred"}
            label="Date Starred"
          />
          <FilterLink
            href={buildFilterUrl(filters, { sort: "updated" })}
            active={filters.sort === "updated"}
            label="Last Updated"
          />
          <FilterLink
            href={buildFilterUrl(filters, { sort: "stars" })}
            active={filters.sort === "stars"}
            label="Star Count"
          />
          <FilterLink
            href={buildFilterUrl(filters, { sort: "name" })}
            active={filters.sort === "name"}
            label="Name"
          />
        </nav>
      </div>
    </aside>
  );
}

function FilterLink({
  href,
  active,
  label,
  count,
  color,
}: {
  href: string;
  active: boolean;
  label: string;
  count?: number;
  color?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between px-2 py-1.5 rounded text-sm transition-colors ${
        active
          ? "bg-gray-800 text-gray-100"
          : "text-gray-400 hover:text-gray-200 hover:bg-gray-900"
      }`}
    >
      <span className="flex items-center gap-2">
        {color && (
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
        )}
        {label}
      </span>
      {count !== undefined && (
        <span className="text-xs text-gray-600">{count}</span>
      )}
    </Link>
  );
}
