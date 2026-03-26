export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
  description: string | null;
  homepage: string | null;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  archived: boolean;
  disabled: boolean;
  pushed_at: string;
  html_url: string;
}

export interface GitHubStarredRepo {
  starred_at: string;
  repo: GitHubRepo;
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  published_at: string;
  body: string | null;
}

export interface GitHubRateLimit {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}
