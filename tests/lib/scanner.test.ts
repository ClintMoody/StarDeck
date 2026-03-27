import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  parseGitRemoteUrl,
  findGitRepos,
  matchScanResults,
  type ScanResult,
  type MatchResult,
} from "@/lib/scanner";

// ── parseGitRemoteUrl ──────────────────────────────────────────────────

describe("parseGitRemoteUrl", () => {
  it("parses HTTPS URL with .git suffix", () => {
    const result = parseGitRemoteUrl(
      "https://github.com/langchain-ai/langchain.git"
    );
    expect(result).toEqual({ owner: "langchain-ai", name: "langchain" });
  });

  it("parses SSH URL with .git suffix", () => {
    const result = parseGitRemoteUrl(
      "git@github.com:ggerganov/llama.cpp.git"
    );
    expect(result).toEqual({ owner: "ggerganov", name: "llama.cpp" });
  });

  it("parses HTTPS URL without .git suffix", () => {
    const result = parseGitRemoteUrl(
      "https://github.com/vercel/next.js"
    );
    expect(result).toEqual({ owner: "vercel", name: "next.js" });
  });

  it("returns null for non-GitHub URLs", () => {
    expect(parseGitRemoteUrl("https://gitlab.com/foo/bar.git")).toBeNull();
    expect(parseGitRemoteUrl("https://bitbucket.org/foo/bar.git")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseGitRemoteUrl("")).toBeNull();
  });
});

// ── findGitRepos ───────────────────────────────────────────────────────

describe("findGitRepos", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scanner-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("finds a git repo in a direct child", () => {
    const repoDir = path.join(tmpDir, "my-repo");
    fs.mkdirSync(path.join(repoDir, ".git"), { recursive: true });

    const repos = findGitRepos(tmpDir, false);
    expect(repos).toEqual([repoDir]);
  });

  it("finds nested repos when recursive", () => {
    const repo1 = path.join(tmpDir, "org", "repo-a");
    const repo2 = path.join(tmpDir, "org", "repo-b");
    fs.mkdirSync(path.join(repo1, ".git"), { recursive: true });
    fs.mkdirSync(path.join(repo2, ".git"), { recursive: true });

    const repos = findGitRepos(tmpDir, true);
    expect(repos.sort()).toEqual([repo1, repo2].sort());
  });

  it("skips nested repos when not recursive", () => {
    const nested = path.join(tmpDir, "org", "repo-a");
    fs.mkdirSync(path.join(nested, ".git"), { recursive: true });

    const repos = findGitRepos(tmpDir, false);
    expect(repos).toEqual([]);
  });

  it("returns empty for nonexistent directory", () => {
    const repos = findGitRepos(path.join(tmpDir, "does-not-exist"), false);
    expect(repos).toEqual([]);
  });

  it("skips node_modules", () => {
    const nmRepo = path.join(tmpDir, "node_modules", "pkg");
    fs.mkdirSync(path.join(nmRepo, ".git"), { recursive: true });

    const repos = findGitRepos(tmpDir, true);
    expect(repos).toEqual([]);
  });
});

// ── matchScanResults ───────────────────────────────────────────────────

describe("matchScanResults", () => {
  const starredRepos = [
    { id: 1, fullName: "vercel/next.js" },
    { id: 2, fullName: "facebook/react" },
    { id: 3, fullName: "ggerganov/llama.cpp" },
  ];

  it("auto-matches by fullName (case-insensitive)", () => {
    const scanResults: ScanResult[] = [
      {
        localPath: "/code/next.js",
        remote: { owner: "Vercel", name: "Next.js" },
        headSha: "abc123",
      },
    ];

    const result = matchScanResults(scanResults, starredRepos, []);
    expect(result.autoMatched).toEqual([
      { repoId: 1, fullName: "vercel/next.js", localPath: "/code/next.js" },
    ]);
    expect(result.ambiguous).toEqual([]);
    expect(result.untracked).toEqual([]);
  });

  it("marks repos without remote as ambiguous", () => {
    const scanResults: ScanResult[] = [
      { localPath: "/code/mystery", remote: null, headSha: "def456" },
    ];

    const result = matchScanResults(scanResults, starredRepos, []);
    expect(result.ambiguous).toEqual([
      { localPath: "/code/mystery", remoteName: null },
    ]);
    expect(result.autoMatched).toEqual([]);
  });

  it("marks non-starred GitHub repos as untracked", () => {
    const scanResults: ScanResult[] = [
      {
        localPath: "/code/unknown-repo",
        remote: { owner: "somebody", name: "unknown-repo" },
        headSha: "ghi789",
      },
    ];

    const result = matchScanResults(scanResults, starredRepos, []);
    expect(result.untracked).toEqual([
      { localPath: "/code/unknown-repo", remoteName: "somebody/unknown-repo" },
    ]);
    expect(result.autoMatched).toEqual([]);
  });

  it("skips already-tracked paths", () => {
    const scanResults: ScanResult[] = [
      {
        localPath: "/code/next.js",
        remote: { owner: "vercel", name: "next.js" },
        headSha: "abc123",
      },
    ];

    const result = matchScanResults(scanResults, starredRepos, ["/code/next.js"]);
    expect(result.autoMatched).toEqual([]);
    expect(result.ambiguous).toEqual([]);
    expect(result.untracked).toEqual([]);
  });
});
