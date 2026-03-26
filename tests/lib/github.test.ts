import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitHubClient } from "@/lib/github";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("GitHubClient", () => {
  let client: GitHubClient;

  beforeEach(() => {
    client = new GitHubClient("test-token");
    mockFetch.mockReset();
  });

  describe("getStarredRepos", () => {
    it("fetches starred repos with star timestamps", async () => {
      const mockResponse = [
        {
          starred_at: "2024-01-15T10:00:00Z",
          repo: {
            id: 12345,
            name: "superpowers",
            full_name: "obra/superpowers",
            owner: { login: "obra" },
            description: "Claude Code skills",
            homepage: null,
            language: "TypeScript",
            topics: ["cli"],
            stargazers_count: 100,
            forks_count: 10,
            open_issues_count: 5,
            archived: false,
            disabled: false,
            pushed_at: "2024-03-20T12:00:00Z",
            html_url: "https://github.com/obra/superpowers",
          },
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({
          "x-ratelimit-remaining": "4999",
          "x-ratelimit-limit": "5000",
          "x-ratelimit-reset": "1700000000",
        }),
      });

      const result = await client.getStarredRepos(1);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/user/starred?per_page=100&page=1",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
            Accept: "application/vnd.github.star+json",
          }),
        })
      );

      expect(result.repos).toHaveLength(1);
      expect(result.repos[0].repo.full_name).toBe("obra/superpowers");
      expect(result.repos[0].starred_at).toBe("2024-01-15T10:00:00Z");
    });

    it("throws on rate limit exceeded", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: new Headers({
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": "1700000000",
        }),
        json: async () => ({ message: "API rate limit exceeded" }),
      });

      await expect(client.getStarredRepos(1)).rejects.toThrow("rate limit");
    });
  });

  describe("getLatestRelease", () => {
    it("fetches the latest release for a repo", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          tag_name: "v5.0.6",
          name: "v5.0.6",
          published_at: "2024-03-20T12:00:00Z",
          body: "Bug fixes and improvements",
        }),
        headers: new Headers({
          "x-ratelimit-remaining": "4998",
        }),
      });

      const release = await client.getLatestRelease("obra", "superpowers");

      expect(release).toBeDefined();
      expect(release!.tag_name).toBe("v5.0.6");
    });

    it("returns null for repos with no releases", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({}),
        json: async () => ({ message: "Not Found" }),
      });

      const release = await client.getLatestRelease("test", "no-releases");
      expect(release).toBeNull();
    });
  });

  describe("getReadmeHtml", () => {
    it("fetches pre-rendered README HTML", async () => {
      const mockHtml = "<h1>Superpowers</h1><p>Claude Code skills</p>";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml,
        headers: new Headers({
          "x-ratelimit-remaining": "4997",
        }),
      });

      const html = await client.getReadmeHtml("obra", "superpowers");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/obra/superpowers/readme",
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: "application/vnd.github.html",
          }),
        })
      );

      expect(html).toBe(mockHtml);
    });

    it("returns null when no README exists", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({}),
        json: async () => ({ message: "Not Found" }),
      });

      const html = await client.getReadmeHtml("test", "no-readme");
      expect(html).toBeNull();
    });
  });

  describe("getRateLimit", () => {
    it("parses rate limit headers", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: new Headers({
          "x-ratelimit-limit": "5000",
          "x-ratelimit-remaining": "4500",
          "x-ratelimit-reset": "1700000000",
        }),
      });

      await client.getStarredRepos(1);

      expect(client.rateLimit).toEqual({
        limit: 5000,
        remaining: 4500,
        reset: 1700000000,
      });
    });
  });
});
