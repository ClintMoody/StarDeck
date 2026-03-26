"use client";

import { useState } from "react";

interface BulkToolbarProps {
  selectedCount: number;
  selectedIds: number[];
  onClear: () => void;
  onComplete: () => void;
}

export function BulkToolbar({ selectedCount, selectedIds, onClear, onComplete }: BulkToolbarProps) {
  const [tagName, setTagName] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  async function handleAddTag() {
    if (!tagName.trim()) return;
    await fetch("/api/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-tag", repoIds: selectedIds, tagName: tagName.trim() }),
    });
    setTagName("");
    setShowTagInput(false);
    onComplete();
  }

  async function handleDeleteClones() {
    if (!confirm(`Delete local clones for ${selectedCount} repos?`)) return;
    await fetch("/api/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-clones", repoIds: selectedIds }),
    });
    onComplete();
  }

  return (
    <div className="sticky top-14 z-10 bg-blue-900/20 border border-blue-800/50 rounded-lg px-4 py-3 mb-4 flex items-center gap-3 backdrop-blur-sm">
      <span className="text-sm text-blue-300 font-medium">
        {selectedCount} selected
      </span>
      <div className="h-4 w-px bg-blue-800" />

      {showTagInput ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
            placeholder="Tag name"
            autoFocus
            className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 w-32 focus:outline-none focus:border-blue-600"
          />
          <button onClick={handleAddTag} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Add</button>
          <button onClick={() => setShowTagInput(false)} className="text-xs text-gray-500">Cancel</button>
        </div>
      ) : (
        <button
          onClick={() => setShowTagInput(true)}
          className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded transition-colors"
        >
          Add Tag
        </button>
      )}

      <button
        onClick={handleDeleteClones}
        className="text-xs bg-gray-800 hover:bg-red-900/50 text-gray-300 hover:text-red-300 px-3 py-1.5 rounded transition-colors"
      >
        Delete Clones
      </button>

      <div className="flex-1" />
      <button onClick={onClear} className="text-xs text-gray-500 hover:text-gray-300">
        Clear selection
      </button>
    </div>
  );
}
