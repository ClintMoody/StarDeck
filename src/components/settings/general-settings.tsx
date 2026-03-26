"use client";

import { useState } from "react";

interface GeneralSettingsProps {
  initialSettings: Record<string, string>;
}

export function GeneralSettings({ initialSettings }: GeneralSettingsProps) {
  const [settings, setSettings] = useState(initialSettings);

  async function save(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">General</h2>

      <div>
        <label className="text-sm text-gray-400 block mb-1">Clone Directory</label>
        <input
          type="text"
          value={settings.clone_directory ?? "~/stardeck-repos"}
          onChange={(e) => save("clone_directory", e.target.value)}
          className="w-96 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono focus:outline-none focus:border-blue-700"
        />
      </div>

      <div>
        <label className="text-sm text-gray-400 block mb-1">Sync Interval (minutes)</label>
        <input
          type="number"
          min={5}
          max={1440}
          value={settings.sync_interval_minutes ?? "15"}
          onChange={(e) => save("sync_interval_minutes", e.target.value)}
          className="w-24 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-700"
        />
      </div>
    </div>
  );
}
