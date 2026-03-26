import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { RepoHeader } from "@/components/detail/repo-header";
import { TabNav } from "@/components/detail/tab-nav";
import type { TabId } from "@/components/detail/tab-nav";
import { ReadmeView } from "@/components/detail/readme-view";
import { ReleasesView } from "@/components/detail/releases-view";
import { NotesEditor } from "@/components/detail/notes-editor";
import { PlaceholderTab } from "@/components/detail/placeholder-tab";
import { RecipeEditor } from "@/components/detail/recipe-editor";
import { LogsView } from "@/components/detail/logs-view";
import { getRepoByFullName, getRepoReleases } from "@/lib/queries";
import "@/lib/db/migrate";

interface PageProps {
  params: Promise<{ owner: string; name: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RepoDetailPage({ params, searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { owner, name } = await params;
  const search = await searchParams;
  const repo = getRepoByFullName(owner, name);

  if (!repo) notFound();

  const activeTab = (typeof search.tab === "string" ? search.tab : "readme") as TabId;
  const basePath = `/repo/${owner}/${name}`;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <RepoHeader
        fullName={repo.fullName}
        description={repo.description}
        language={repo.language}
        starCount={repo.starCount}
        forkCount={repo.forkCount}
      />

      <TabNav activeTab={activeTab} basePath={basePath} />

      {activeTab === "readme" && <ReadmeView owner={owner} name={name} />}
      {activeTab === "releases" && <ReleasesView releases={getRepoReleases(repo.id)} />}
      {activeTab === "notes" && <NotesEditor repoId={repo.id} />}
      {activeTab === "logs" && <LogsView owner={owner} name={name} />}
      {activeTab === "recipe" && <RecipeEditor owner={owner} name={name} />}
    </div>
  );
}
