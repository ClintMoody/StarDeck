"use client";

import { useState, useEffect, useRef } from "react";

export function LogsView({ owner, name }: { owner: string; name: string }) {
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
        return updated.length > 500 ? updated.slice(-500) : updated;
      });
    };

    eventSource.onerror = () => {
      setConnected(false);
      eventSource.close();
    };

    return () => eventSource.close();
  }, [owner, name]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-gray-600"}`} />
        <span className="text-xs text-gray-500">{connected ? "Connected" : "No active process"}</span>
      </div>
      <div
        ref={outputRef}
        className="bg-black rounded-lg p-4 h-96 overflow-y-auto font-mono text-xs text-gray-300 whitespace-pre-wrap"
      >
        {lines.length === 0 ? (
          <span className="text-gray-600">
            No output yet. Clone and run the project to see logs here.
          </span>
        ) : (
          lines.map((line, i) => <div key={i}>{line}</div>)
        )}
      </div>
    </div>
  );
}
