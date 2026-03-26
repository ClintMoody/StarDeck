import type { RepoFilters } from "@/lib/queries";

export function parseFiltersFromParams(
  searchParams: Record<string, string | string[] | undefined>
): RepoFilters {
  return {
    search: typeof searchParams.q === "string" ? searchParams.q : undefined,
    language: typeof searchParams.lang === "string" ? searchParams.lang : undefined,
    tagId: typeof searchParams.tag === "string" ? parseInt(searchParams.tag, 10) : undefined,
    status: parseStatus(searchParams.status),
    sort: parseSort(searchParams.sort),
  };
}

function parseStatus(
  value: string | string[] | undefined
): RepoFilters["status"] {
  if (typeof value !== "string") return "all";
  const valid = ["all", "starred", "cloned", "running", "updates"] as const;
  return valid.includes(value as any) ? (value as RepoFilters["status"]) : "all";
}

function parseSort(
  value: string | string[] | undefined
): RepoFilters["sort"] {
  if (typeof value !== "string") return "starred";
  const valid = ["starred", "updated", "stars", "name"] as const;
  return valid.includes(value as any) ? (value as RepoFilters["sort"]) : "starred";
}

export function buildFilterUrl(
  baseFilters: RepoFilters,
  overrides: Partial<RepoFilters>
): string {
  const merged = { ...baseFilters, ...overrides };
  const params = new URLSearchParams();

  if (merged.search) params.set("q", merged.search);
  if (merged.language) params.set("lang", merged.language);
  if (merged.tagId) params.set("tag", String(merged.tagId));
  if (merged.status && merged.status !== "all") params.set("status", merged.status);
  if (merged.sort && merged.sort !== "starred") params.set("sort", merged.sort);

  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}
