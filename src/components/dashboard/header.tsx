import { SearchInput } from "@/components/search-input";
import { SyncButton } from "@/components/sync-button";
import { NotificationBell } from "@/components/notification-bell";
import { signOut } from "@/lib/auth";

interface HeaderProps {
  userName: string | null | undefined;
  lastSyncTime: string | null;
}

export function DashboardHeader({ userName, lastSyncTime }: HeaderProps) {
  const syncAgo = lastSyncTime ? formatTimeAgo(lastSyncTime) : null;

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-center gap-6">
        <h1 className="text-lg font-bold tracking-tight">StarDeck</h1>
        <SearchInput />
      </div>
      <div className="flex items-center gap-4">
        <NotificationBell />
        {syncAgo && (
          <span className="text-xs text-gray-500">
            Synced {syncAgo}
          </span>
        )}
        <SyncButton />
        <span className="text-sm text-gray-400">{userName}</span>
        <a href="/settings" className="text-gray-500 hover:text-gray-300 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </a>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
