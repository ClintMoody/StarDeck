import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">StarDeck</h1>
        <div className="text-sm text-gray-400">
          Signed in as {session.user?.name}
        </div>
      </div>
      <p className="text-gray-400">
        Authenticated. Sync engine coming next.
      </p>
    </div>
  );
}
