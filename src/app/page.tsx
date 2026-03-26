import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { starredRepos } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { RepoGrid } from "@/components/repo-grid";
import { SyncButton } from "@/components/sync-button";
import { signOut } from "@/lib/auth";
import "@/lib/db/migrate";

export default async function HomePage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const repos = db
    .select()
    .from(starredRepos)
    .where(eq(starredRepos.unstarred, false))
    .orderBy(desc(starredRepos.starredAt))
    .all();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">StarDeck</h1>
          <p className="text-sm text-gray-400">
            {repos.length} starred repos
          </p>
        </div>
        <div className="flex items-center gap-4">
          <SyncButton />
          <div className="text-sm text-gray-400">
            {session.user?.name}
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-gray-300"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <RepoGrid repos={repos} />
    </div>
  );
}
