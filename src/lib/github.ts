import type {
  GitHubStarredRepo,
  GitHubRelease,
  GitHubRateLimit,
} from "@/types/github";

export class GitHubClient {
  private token: string;
  private baseUrl = "https://api.github.com";
  rateLimit: GitHubRateLimit | null = null;

  constructor(token: string) {
    this.token = token;
  }

  private headers(accept?: string): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: accept ?? "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  private updateRateLimit(headers: Headers): void {
    const limit = headers.get("x-ratelimit-limit");
    const remaining = headers.get("x-ratelimit-remaining");
    const reset = headers.get("x-ratelimit-reset");

    if (remaining !== null) {
      this.rateLimit = {
        limit: limit ? parseInt(limit, 10) : 5000,
        remaining: parseInt(remaining, 10),
        reset: reset ? parseInt(reset, 10) : 0,
      };
    }
  }

  async getStarredRepos(
    page: number = 1
  ): Promise<{ repos: GitHubStarredRepo[]; hasMore: boolean }> {
    const url = `${this.baseUrl}/user/starred?per_page=100&page=${page}`;
    const response = await fetch(url, {
      headers: this.headers("application/vnd.github.star+json"),
    });

    this.updateRateLimit(response.headers);

    if (!response.ok) {
      if (response.status === 403 && this.rateLimit?.remaining === 0) {
        throw new Error(
          `GitHub API rate limit exceeded. Resets at ${new Date(this.rateLimit.reset * 1000).toISOString()}`
        );
      }
      const body = await response.json();
      throw new Error(`GitHub API error (${response.status}): ${body.message}`);
    }

    const repos: GitHubStarredRepo[] = await response.json();
    return { repos, hasMore: repos.length === 100 };
  }

  async getAllStarredRepos(): Promise<GitHubStarredRepo[]> {
    const allRepos: GitHubStarredRepo[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await this.getStarredRepos(page);
      allRepos.push(...result.repos);
      hasMore = result.hasMore;
      page++;
    }

    return allRepos;
  }

  async getLatestRelease(
    owner: string,
    repo: string
  ): Promise<GitHubRelease | null> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/releases/latest`;
    const response = await fetch(url, { headers: this.headers() });

    this.updateRateLimit(response.headers);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const body = await response.json();
      throw new Error(`GitHub API error (${response.status}): ${body.message}`);
    }

    return response.json();
  }

  async getReadmeHtml(
    owner: string,
    repo: string
  ): Promise<string | null> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/readme`;
    const response = await fetch(url, {
      headers: this.headers("application/vnd.github.html"),
    });

    this.updateRateLimit(response.headers);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    return response.text();
  }
}
