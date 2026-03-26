"use client";

import { useState } from "react";

export function DataSettings() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/export");
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `stardeck-export-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      const data = await res.json();
      setImportResult(res.ok ? `Imported: ${data.message}` : `Error: ${data.error}`);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">Data</h2>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm text-gray-400 mb-1">Export</h3>
          <p className="text-xs text-gray-600 mb-2">Download tags, recipes, notes, and settings as JSON</p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            {exporting ? "Exporting..." : "Export Data"}
          </button>
        </div>

        <div>
          <h3 className="text-sm text-gray-400 mb-1">Import</h3>
          <p className="text-xs text-gray-600 mb-2">Restore from a previous export</p>
          <label className="inline-block bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg cursor-pointer transition-colors">
            {importing ? "Importing..." : "Import Data"}
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          {importResult && (
            <p className="text-xs text-gray-400 mt-2">{importResult}</p>
          )}
        </div>
      </div>
    </div>
  );
}
