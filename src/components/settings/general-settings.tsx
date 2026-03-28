"use client";

import { useState } from "react";

interface BrowseFolder {
  name: string;
  path: string;
}

interface GeneralSettingsProps {
  initialSettings: Record<string, string>;
}

export function GeneralSettings({ initialSettings }: GeneralSettingsProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [browsing, setBrowsing] = useState(false);
  const [browseDir, setBrowseDir] = useState('');
  const [browseParent, setBrowseParent] = useState('');
  const [browseFolders, setBrowseFolders] = useState<BrowseFolder[]>([]);

  async function save(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  }

  async function openBrowser(dir?: string) {
    const params = dir ? `?dir=${encodeURIComponent(dir)}` : '';
    const res = await fetch(`/api/scan/browse${params}`);
    const data = await res.json();
    if (data.error) return;
    setBrowseDir(data.current);
    setBrowseParent(data.parent);
    setBrowseFolders(data.folders);
    setBrowsing(true);
  }

  function selectDir(dir: string) {
    save("clone_directory", dir);
    setBrowsing(false);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">General</h2>

      <div>
        <label className="text-sm text-gray-400 block mb-1">Clone Directory</label>
        <div className="flex gap-2 items-start">
          <input
            type="text"
            value={settings.clone_directory ?? "~/stardeck-repos"}
            onChange={(e) => save("clone_directory", e.target.value)}
            className="w-96 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono focus:outline-none focus:border-blue-700"
          />
          <button
            onClick={() => openBrowser(settings.clone_directory || undefined)}
            className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors flex-shrink-0"
          >
            Browse
          </button>
        </div>
        {browsing && (
          <div className="mt-2 w-[500px] bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 bg-gray-950">
              <button
                onClick={() => openBrowser(browseParent)}
                disabled={browseDir === browseParent}
                className="text-xs text-blue-400 hover:underline disabled:text-gray-600 disabled:no-underline"
              >
                Up
              </button>
              <span className="text-xs text-gray-300 font-mono truncate flex-1" title={browseDir}>{browseDir}</span>
              <button
                onClick={() => selectDir(browseDir)}
                className="bg-blue-600 text-white text-xs px-2.5 py-1 rounded hover:bg-blue-700 flex-shrink-0"
              >
                Select This Folder
              </button>
              <button
                onClick={() => setBrowsing(false)}
                className="text-xs text-gray-500 hover:text-gray-300 px-1"
              >
                Cancel
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {browseFolders.length === 0 ? (
                <div className="text-xs text-gray-600 px-3 py-3">No subfolders found.</div>
              ) : (
                browseFolders.map(folder => (
                  <button
                    key={folder.path}
                    onClick={() => openBrowser(folder.path)}
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2"
                  >
                    <span className="text-gray-500">📁</span>
                    {folder.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
        <p className="text-xs text-gray-600 mt-1">Default location for cloned repos. You can override per-repo when cloning.</p>
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
