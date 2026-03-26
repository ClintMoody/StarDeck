import type { ReactNode } from "react";

interface DashboardLayoutProps {
  header: ReactNode;
  sidebar: ReactNode;
  main: ReactNode;
  activityFeed: ReactNode;
}

export function DashboardLayout({
  header,
  sidebar,
  main,
  activityFeed,
}: DashboardLayoutProps) {
  return (
    <div className="flex flex-col h-screen">
      {header}
      <div className="flex flex-1 overflow-hidden">
        {sidebar}
        <main className="flex-1 overflow-y-auto p-6">
          {main}
        </main>
        {activityFeed}
      </div>
    </div>
  );
}
