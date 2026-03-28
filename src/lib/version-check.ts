export interface VersionInput {
  localTag: string | null;
  localSha: string | null;
  latestRelease: string | null;
  latestRemoteSha: string | null;
}

export interface VersionResult {
  status: "up_to_date" | "outdated" | "not_cloned" | "vulnerable" | "unknown";
  localVersion: string | null;
  remoteVersion: string | null;
}

/** Returns true if the version string looks like a tag (v1.0.0 or 1.0.0) rather than a SHA */
export function isTag(version: string | null): boolean {
  if (!version) return false;
  return version.startsWith("v") || /^\d+\.\d+/.test(version);
}

function shortSha(sha: string | null): string | null {
  if (!sha) return null;
  return sha.slice(0, 7);
}

export function compareVersions(input: VersionInput): VersionResult {
  const { localTag, localSha, latestRelease, latestRemoteSha } = input;

  // Not cloned
  if (!localSha) {
    return {
      status: "not_cloned",
      localVersion: null,
      remoteVersion: latestRelease ?? shortSha(latestRemoteSha),
    };
  }

  // Has localTag + latestRelease -> compare tags
  if (localTag && latestRelease) {
    return {
      status: localTag === latestRelease ? "up_to_date" : "outdated",
      localVersion: localTag,
      remoteVersion: latestRelease,
    };
  }

  // No releases, fall back to SHA comparison
  if (latestRemoteSha) {
    const localShort = shortSha(localSha)!;
    const remoteShort = shortSha(latestRemoteSha)!;
    return {
      status: localShort === remoteShort ? "up_to_date" : "outdated",
      localVersion: localShort,
      remoteVersion: remoteShort,
    };
  }

  // No remote info at all
  return {
    status: "unknown",
    localVersion: localTag ?? shortSha(localSha),
    remoteVersion: null,
  };
}

export function formatVersionDisplay(result: VersionResult): string {
  const { status, localVersion, remoteVersion } = result;

  switch (status) {
    case "up_to_date":
      return `${localVersion} ✓`;

    case "outdated":
    case "vulnerable":
      if (localVersion && remoteVersion) {
        return `${localVersion} → ${remoteVersion}`;
      }
      return "—";

    case "not_cloned":
      if (remoteVersion) {
        return `Latest: ${remoteVersion}`;
      }
      return "—";

    case "unknown":
    default:
      return "—";
  }
}

// getLocalVersionInfo has been moved to version-check-local.ts
// to keep this module client-safe (no child_process dependency)
