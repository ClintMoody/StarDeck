import Link from "next/link";
import type { RepoFilters } from "@/lib/queries";
import type { CategoryCount } from "@/lib/categories";
import { buildFilterUrl } from "@/lib/filters";

interface SidebarProps {
  filters: RepoFilters;
  repoCount: number;
  categories: CategoryCount[];
  tags: { id: number; name: string; color: string | null }[];
}

export function Sidebar({ filters, repoCount, categories, tags }: SidebarProps) {
  return (
    <aside className="w-56 flex-shrink-0 border-r border-gray-800 overflow-y-auto p-4 space-y-6">
      {/* Status Filters */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Filter
        </h3>
        <nav className="space-y-1">
          <FilterLink
            href={buildFilterUrl(filters, { status: "all", language: undefined, category: undefined, tagId: undefined })}
            active={!filters.status || filters.status === "all"}
            label="All Stars"
            count={repoCount}
            icon="⭐"
          />
        </nav>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Categories
          </h3>
          <nav className="space-y-1">
            {categories.map((cat) => (
              <FilterLink
                key={cat.name}
                href={buildFilterUrl(filters, { category: cat.name, language: undefined })}
                active={filters.category === cat.name}
                label={cat.name}
                count={cat.count}
                icon={cat.icon}
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
  icon,
}: {
  href: string;
  active: boolean;
  label: string;
  count?: number;
  color?: string;
  icon?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between px-2 py-1.5 rounded text-sm transition-colors ${
        active
          ? "bg-blue-900/30 text-blue-300 border border-blue-800/50"
          : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
      }`}
    >
      <span className="flex items-center gap-2 truncate">
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {color && (
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
        )}
        <span className="truncate">{label}</span>
      </span>
      {count !== undefined && (
        <span className={`text-xs ml-1 flex-shrink-0 ${active ? "text-blue-400" : "text-gray-600"}`}>
          {count}
        </span>
      )}
    </Link>
  );
}
