import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  compareVersions,
  formatVersionDisplay,
  isTag,
  type VersionInput,
  type VersionResult,
} from "@/lib/version-check";

describe("compareVersions", () => {
  it("detects up-to-date release (localTag === latestRelease)", () => {
    const input: VersionInput = {
      localTag: "v1.0.0",
      localSha: "abc1234567890",
      latestRelease: "v1.0.0",
      latestRemoteSha: "abc1234567890",
    };
    const result = compareVersions(input);
    expect(result.status).toBe("up_to_date");
    expect(result.localVersion).toBe("v1.0.0");
    expect(result.remoteVersion).toBe("v1.0.0");
  });

  it("detects outdated release (localTag !== latestRelease)", () => {
    const input: VersionInput = {
      localTag: "v0.1.5",
      localSha: "abc1234567890",
      latestRelease: "v0.2.1",
      latestRemoteSha: "def5678901234",
    };
    const result = compareVersions(input);
    expect(result.status).toBe("outdated");
    expect(result.localVersion).toBe("v0.1.5");
    expect(result.remoteVersion).toBe("v0.2.1");
  });

  it("falls back to commit comparison when no releases", () => {
    const input: VersionInput = {
      localTag: null,
      localSha: "abc1234567890",
      latestRelease: null,
      latestRemoteSha: "def5678901234",
    };
    const result = compareVersions(input);
    expect(result.status).toBe("outdated");
    expect(result.localVersion).toBe("abc1234");
    expect(result.remoteVersion).toBe("def5678");
  });

  it("handles not-cloned state (no localSha)", () => {
    const input: VersionInput = {
      localTag: null,
      localSha: null,
      latestRelease: "v1.0.0",
      latestRemoteSha: null,
    };
    const result = compareVersions(input);
    expect(result.status).toBe("not_cloned");
    expect(result.localVersion).toBeNull();
    expect(result.remoteVersion).toBe("v1.0.0");
  });

  it("handles not-cloned with latestRemoteSha fallback", () => {
    const input: VersionInput = {
      localTag: null,
      localSha: null,
      latestRelease: null,
      latestRemoteSha: "abc1234567890",
    };
    const result = compareVersions(input);
    expect(result.status).toBe("not_cloned");
    expect(result.localVersion).toBeNull();
    expect(result.remoteVersion).toBe("abc1234");
  });

  it("detects up-to-date by SHA when no releases", () => {
    const input: VersionInput = {
      localTag: null,
      localSha: "abc1234567890",
      latestRelease: null,
      latestRemoteSha: "abc1234999999",
    };
    const result = compareVersions(input);
    expect(result.status).toBe("up_to_date");
    expect(result.localVersion).toBe("abc1234");
    expect(result.remoteVersion).toBe("abc1234");
  });

  it("returns unknown when no remote info", () => {
    const input: VersionInput = {
      localTag: null,
      localSha: "abc1234567890",
      latestRelease: null,
      latestRemoteSha: null,
    };
    const result = compareVersions(input);
    expect(result.status).toBe("unknown");
  });
});

describe("formatVersionDisplay", () => {
  it("formats release comparison (outdated)", () => {
    const result: VersionResult = {
      status: "outdated",
      localVersion: "v0.1.5",
      remoteVersion: "v0.2.1",
    };
    expect(formatVersionDisplay(result)).toBe("v0.1.5 → v0.2.1");
  });

  it("formats SHA comparison (outdated)", () => {
    const result: VersionResult = {
      status: "outdated",
      localVersion: "abc1234",
      remoteVersion: "def5678",
    };
    expect(formatVersionDisplay(result)).toBe("abc1234 → def5678");
  });

  it("formats up to date with tag", () => {
    const result: VersionResult = {
      status: "up_to_date",
      localVersion: "v1.0.0",
      remoteVersion: "v1.0.0",
    };
    expect(formatVersionDisplay(result)).toBe("v1.0.0 ✓");
  });

  it("formats up to date with SHA", () => {
    const result: VersionResult = {
      status: "up_to_date",
      localVersion: "abc1234",
      remoteVersion: "abc1234",
    };
    expect(formatVersionDisplay(result)).toBe("abc1234 ✓");
  });

  it("formats not cloned with remote version", () => {
    const result: VersionResult = {
      status: "not_cloned",
      localVersion: null,
      remoteVersion: "v1.0.0",
    };
    expect(formatVersionDisplay(result)).toBe("Latest: v1.0.0");
  });

  it("formats not cloned without remote version", () => {
    const result: VersionResult = {
      status: "not_cloned",
      localVersion: null,
      remoteVersion: null,
    };
    expect(formatVersionDisplay(result)).toBe("—");
  });

  it("formats vulnerable status", () => {
    const result: VersionResult = {
      status: "vulnerable",
      localVersion: "v0.1.5",
      remoteVersion: "v0.2.1",
    };
    expect(formatVersionDisplay(result)).toBe("v0.1.5 → v0.2.1");
  });

  it("formats unknown status", () => {
    const result: VersionResult = {
      status: "unknown",
      localVersion: null,
      remoteVersion: null,
    };
    expect(formatVersionDisplay(result)).toBe("—");
  });
});

describe("isTag", () => {
  it("returns true for v-prefixed versions", () => {
    expect(isTag("v1.0.0")).toBe(true);
    expect(isTag("v0.1.5")).toBe(true);
  });

  it("returns true for numeric semver without v prefix", () => {
    expect(isTag("1.0.0")).toBe(true);
    expect(isTag("0.1.5")).toBe(true);
  });

  it("returns false for plain SHAs", () => {
    expect(isTag("abc1234")).toBe(false);
    expect(isTag("def5678")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isTag(null)).toBe(false);
  });
});
