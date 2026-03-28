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
        <div className="flex gap-2 items-center">
          <span className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono flex-1 max-w-md truncate" title={settings.clone_directory ?? "~/stardeck-repos"}>
            {settings.clone_directory ?? "~/stardeck-repos"}
          </span>
          <button
            onClick={() => openBrowser(settings.clone_directory || undefined)}
            className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors flex-shrink-0"
          >
            Browse
          </button>
        </div>
        {browsing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setBrowsing(false)} />
            <div className="relative w-[520px] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-gray-950">
                <button
                  onClick={() => openBrowser(browseParent)}
                  disabled={browseDir === browseParent}
                  className="text-xs text-blue-400 hover:underline disabled:text-gray-600 disabled:no-underline"
                >
                  Up
                </button>
                <span className="text-sm text-gray-300 font-mono truncate flex-1" title={browseDir}>{browseDir}</span>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {browseFolders.length === 0 ? (
                  <div className="text-sm text-gray-600 px-4 py-6 text-center">No subfolders found.</div>
                ) : (
                  browseFolders.map(folder => (
                    <button
                      key={folder.path}
                      onClick={() => openBrowser(folder.path)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2 transition-colors"
                    >
                      <span className="text-gray-500">📁</span>
                      {folder.name}
                    </button>
                  ))
                )}
              </div>
              <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-800 bg-gray-950">
                <button
                  onClick={() => setBrowsing(false)}
                  className="text-sm text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => selectDir(browseDir)}
                  className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Select This Folder
                </button>
              </div>
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
