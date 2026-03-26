"use client";

import { useRouter } from "next/navigation";

const TABS = [
  { id: "readme", label: "README" },
  { id: "releases", label: "Releases" },
  { id: "logs", label: "Run Logs" },
  { id: "recipe", label: "Recipe" },
  { id: "notes", label: "Notes" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export function TabNav({ activeTab, basePath }: { activeTab: TabId; basePath: string }) {
  const router = useRouter();

  return (
    <div className="flex gap-1 border-b border-gray-800 mb-6">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => {
            const url = tab.id === "readme" ? basePath : `${basePath}?tab=${tab.id}`;
            router.push(url);
          }}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            activeTab === tab.id
              ? "text-blue-400"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          {tab.label}
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
