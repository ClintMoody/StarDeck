"use client";

import { useEffect, useState } from "react";

export function KeyboardHandler() {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      switch (e.key) {
        case "?":
          e.preventDefault();
          setShowHelp((prev) => !prev);
          break;
        case "Escape":
          setShowHelp(false);
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!showHelp) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={() => setShowHelp(false)}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">Keyboard Shortcuts</h2>
        <div className="space-y-2 text-sm">
          <ShortcutRow keys="/" label="Focus search" />
          <ShortcutRow keys="Esc" label="Clear search / close panel" />
          <ShortcutRow keys="?" label="Toggle this help" />
        </div>
        <p className="text-xs text-gray-600 mt-4">
          More shortcuts coming in future updates.
        </p>
      </div>
    </div>
  );
}

function ShortcutRow({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400">{label}</span>
      <kbd className="bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-xs font-mono text-gray-300">
        {keys}
      </kbd>
    </div>
  );
}
