"use client";

import { useState, useEffect, useCallback } from "react";

export function NotesEditor({ repoId }: { repoId: number }) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    async function loadNote() {
      const res = await fetch(`/api/notes?repoId=${repoId}`);
      if (res.ok) {
        const data = await res.json();
        setContent(data.content ?? "");
      }
    }
    loadNote();
  }, [repoId]);

  const saveNote = useCallback(async () => {
    setSaving(true);
    try {
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoId, content }),
      });
      setLastSaved(new Date().toLocaleTimeString());
    } finally {
      setSaving(false);
    }
  }, [repoId, content]);

  // Auto-save on blur
  function handleBlur() {
    saveNote();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400">Personal Notes</h3>
        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-xs text-gray-600">Saved {lastSaved}</span>
          )}
          <button
            onClick={saveNote}
            disabled={saving}
            className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-3 py-1 rounded transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleBlur}
        placeholder="Add notes about this repo... (e.g., what it's useful for, how you've used it, alternatives)"
        className="w-full h-64 bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm text-gray-300 placeholder-gray-600 resize-y focus:outline-none focus:border-blue-700 transition-colors"
      />
    </div>
  );
}
