"use client";

import { useState, useEffect, useRef } from "react";

interface TerminalPanelProps {
  owner: string;
  name: string;
  onClose: () => void;
}

export function TerminalPanel({ owner, name, onClose }: TerminalPanelProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource(`/api/process-stream?owner=${owner}&name=${name}`);

    eventSource.onopen = () => setConnected(true);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLines((prev) => {
        const updated = [...prev, data];
        // Keep last 500 lines
        return updated.length > 500 ? updated.slice(-500) : updated;
      });
    };

    eventSource.onerror = () => {
      setConnected(false);
      eventSource.close();
    };

    return () => eventSource.close();
  }, [owner, name]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="border-t border-gray-800 bg-black/90">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900/50 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-400">
            {owner}/{name}
          </span>
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-gray-600"}`} />
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 text-sm"
        >
          &#x25BC; Close
        </button>
      </div>
      <div
        ref={outputRef}
        className="h-48 overflow-y-auto p-3 font-mono text-xs text-gray-300 whitespace-pre-wrap"
      >
        {lines.length === 0 ? (
          <span className="text-gray-600">Waiting for output...</span>
        ) : (
          lines.map((line, i) => <div key={i}>{line}</div>)
        )}
      </div>
    </div>
  );
}
