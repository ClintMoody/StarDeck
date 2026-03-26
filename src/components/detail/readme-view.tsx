"use client";

import { useEffect, useState } from "react";

export function ReadmeView({ owner, name }: { owner: string; name: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReadme() {
      try {
        const res = await fetch(`/api/readme?owner=${owner}&name=${name}`);
        if (res.ok) {
          const text = await res.text();
          setHtml(text);
        } else {
          setError("README not available");
        }
      } catch {
        setError("Failed to load README");
      } finally {
        setLoading(false);
      }
    }
    fetchReadme();
  }, [owner, name]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-gray-500 text-sm">Loading README...</div>
      </div>
    );
  }

  if (error || !html) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-gray-600 text-sm">{error ?? "No README found"}</div>
      </div>
    );
  }

  return (
    <div
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
