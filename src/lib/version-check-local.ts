import { execSync } from "child_process";

/** Read local git version info from a cloned repo path (Node.js only — not for client components) */
export function getLocalVersionInfo(
  clonePath: string
): { sha: string | null; tag: string | null } {
  let sha: string | null = null;
  let tag: string | null = null;

  try {
    sha = execSync("git rev-parse HEAD", {
      cwd: clonePath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    // not a git repo or other error
  }

  try {
    tag = execSync("git describe --tags --exact-match 2>/dev/null", {
      cwd: clonePath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (!tag) tag = null;
  } catch {
    // no tag at current commit
  }

  return { sha, tag };
}
