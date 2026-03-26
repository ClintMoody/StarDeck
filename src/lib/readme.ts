import { db } from "@/lib/db";
import { starredRepos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import "@/lib/db/migrate";

/**
 * Fetch README as pre-rendered HTML from GitHub API and cache in SQLite.
 * Returns cached version if available and less than 24 hours old.
 */
export async function getReadmeHtml(
  owner: string,
  name: string,
  accessToken: string
): Promise<string | null> {
  // Check cache first
  const repo = db
    .select()
    .from(starredRepos)
    .where(eq(starredRepos.fullName, `${owner}/${name}`))
    .get();

  if (!repo) return null;

  // Return cached if fresh (less than 24 hours old)
  if (repo.readmeHtml && repo.readmeUpdatedAt) {
    const cacheAge = Date.now() - new Date(repo.readmeUpdatedAt).getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    if (cacheAge < twentyFourHours) {
      return repo.readmeHtml;
    }
  }

  // Fetch from GitHub
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${name}/readme`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.html",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) return repo.readmeHtml ?? null;

    let html = await response.text();

    // Rewrite relative image/link URLs to point to GitHub raw content
    html = rewriteRelativeUrls(html, owner, name);

    // Cache in database
    db.update(starredRepos)
      .set({
        readmeHtml: html,
        readmeUpdatedAt: new Date().toISOString(),
      })
      .where(eq(starredRepos.id, repo.id))
      .run();

    return html;
  } catch {
    // Return stale cache on error
    return repo.readmeHtml ?? null;
  }
}

/**
 * Rewrite relative URLs in GitHub-rendered HTML to absolute GitHub URLs.
 * Handles both raw content (images) and blob URLs (links to files).
 */
function rewriteRelativeUrls(html: string, owner: string, name: string): string {
  const rawBase = `https://raw.githubusercontent.com/${owner}/${name}/HEAD/`;
  const blobBase = `https://github.com/${owner}/${name}/blob/HEAD/`;

  // Rewrite relative src attributes (images, videos)
  html = html.replace(
    /(<img[^>]+src=["'])(?!https?:\/\/|data:)([^"']+)(["'])/gi,
    (_, before, url, after) => `${before}${rawBase}${url.replace(/^\.\//, "")}${after}`
  );

  // Rewrite relative href on anchors that point to files (not #anchors)
  html = html.replace(
    /(<a[^>]+href=["'])(?!https?:\/\/|#|mailto:)([^"']+)(["'])/gi,
    (_, before, url, after) => `${before}${blobBase}${url.replace(/^\.\//, "")}${after}`
  );

  return html;
}
