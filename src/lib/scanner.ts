import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// ── Interfaces ─────────────────────────────────────────────────────────

export interface ParsedRemote {
  owner: string;
  name: string;
}

export interface ScanResult {
  localPath: string;
  remote: ParsedRemote | null;
  headSha: string | null;
}

export interface MatchResult {
  autoMatched: { repoId: number; fullName: string; localPath: string }[];
  ambiguous: { localPath: string; remoteName: string | null }[];
  untracked: { localPath: string; remoteName: string | null }[];
}

// ── parseGitRemoteUrl ──────────────────────────────────────────────────

const HTTPS_RE = /github\.com\/([^/]+)\/(.+?)(?:\.git)?$/;
const SSH_RE = /github\.com:([^/]+)\/(.+?)(?:\.git)?$/;

export function parseGitRemoteUrl(url: string): ParsedRemote | null {
  if (!url) return null;
  const match = url.match(HTTPS_RE) || url.match(SSH_RE);
  if (!match) return null;
  return { owner: match[1], name: match[2] };
}

// ── findGitRepos ───────────────────────────────────────────────────────

const SKIP_DIRS = new Set(["node_modules", "vendor", ".cache"]);

export function findGitRepos(dirPath: string, recursive: boolean): string[] {
  const repos: string[] = [];
  try {
    walk(dirPath, recursive, 0, repos);
  } catch {
    // permission denied or non-existent — return empty
  }
  return repos;
}

function walk(dir: string, recursive: boolean, depth: number, repos: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;

    // Skip hidden dirs and known junk at any depth
    if (name.startsWith(".") || SKIP_DIRS.has(name)) continue;

    const fullPath = path.join(dir, name);

    // Check if this directory is a git repo
    const gitDir = path.join(fullPath, ".git");
    let isRepo = false;
    try {
      isRepo = fs.statSync(gitDir).isDirectory();
    } catch {
      // not a repo
    }

    if (isRepo) {
      repos.push(fullPath);
      // Don't recurse into repos
      continue;
    }

    // Only recurse deeper if recursive mode is on
    if (recursive) {
      walk(fullPath, recursive, depth + 1, repos);
    }
  }
}

// ── getGitInfo ─────────────────────────────────────────────────────────

export function getGitInfo(repoPath: string): ScanResult {
  let remote: ParsedRemote | null = null;
  let headSha: string | null = null;

  try {
    const url = execSync("git remote get-url origin", {
      cwd: repoPath,
      timeout: 5000,
      encoding: "utf-8",
    }).trim();
    remote = parseGitRemoteUrl(url);
  } catch {
    // no remote
  }

  try {
    headSha = execSync("git rev-parse HEAD", {
      cwd: repoPath,
      timeout: 5000,
      encoding: "utf-8",
    }).trim();
  } catch {
    // no HEAD
  }

  return { localPath: repoPath, remote, headSha };
}

// ── matchScanResults ───────────────────────────────────────────────────

export function matchScanResults(
  scanResults: ScanResult[],
  starredRepos: { id: number; fullName: string }[],
  existingClonePaths: string[]
): MatchResult {
  // Build lookup map: lowercase fullName → starred repo
  const starredMap = new Map<string, { id: number; fullName: string }>();
  for (const repo of starredRepos) {
    starredMap.set(repo.fullName.toLowerCase(), repo);
  }

  const trackedSet = new Set(existingClonePaths);

  const result: MatchResult = {
    autoMatched: [],
    ambiguous: [],
    untracked: [],
  };

  for (const scan of scanResults) {
    // Skip already-tracked paths
    if (trackedSet.has(scan.localPath)) continue;

    if (!scan.remote) {
      // No remote — ambiguous
      result.ambiguous.push({ localPath: scan.localPath, remoteName: null });
      continue;
    }

    const remoteName = `${scan.remote.owner}/${scan.remote.name}`;
    const starred = starredMap.get(remoteName.toLowerCase());

    if (starred) {
      result.autoMatched.push({
        repoId: starred.id,
        fullName: starred.fullName,
        localPath: scan.localPath,
      });
    } else {
      result.untracked.push({ localPath: scan.localPath, remoteName });
    }
  }

  return result;
}
