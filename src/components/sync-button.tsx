"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function handleSync() {
    setSyncing(true);
    setResult(null);

    try {
      const response = await fetch("/api/sync", { method: "POST" });
      const data = await response.json();

      if (response.ok) {
        setResult(`Synced: ${data.added} added, ${data.updated} updated`);
        router.refresh();
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch {
      setResult("Sync failed — check console");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:text-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        {syncing ? "Syncing..." : "Sync Now"}
      </button>
      {result && <span className="text-sm text-gray-400">{result}</span>}
    </div>
  );
}
