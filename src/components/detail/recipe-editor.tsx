"use client";

import { useState, useEffect } from "react";

interface Recipe {
  detectedType: string;
  installCommand: string | null;
  runCommand: string | null;
  envVars: string;
  preHooks: string;
  postHooks: string;
  approved: boolean;
}

export function RecipeEditor({ owner, name }: { owner: string; name: string }) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/recipe?owner=${owner}&name=${name}`);
      if (res.ok) {
        const data = await res.json();
        setRecipe(data);
      }
      setLoading(false);
    }
    load();
  }, [owner, name]);

  async function handleSave() {
    if (!recipe) return;
    setSaving(true);
    await fetch("/api/recipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, name, ...recipe, approved: true }),
    });
    setRecipe((prev) => prev ? { ...prev, approved: true } : prev);
    setSaving(false);
  }

  if (loading) return <div className="text-gray-500 text-sm py-8 text-center">Loading recipe...</div>;

  if (!recipe) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">No recipe detected yet</p>
        <p className="text-gray-600 text-sm mt-1">Clone the repo first — the project type will be auto-detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-400">Project Type:</span>
          <span className="text-sm bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded">{recipe.detectedType}</span>
          {recipe.approved && (
            <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded">Approved</span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-3 py-1 rounded transition-colors"
        >
          {saving ? "Saving..." : recipe.approved ? "Update Recipe" : "Approve & Save"}
        </button>
      </div>

      <div className="space-y-3">
        <Field
          label="Install Command"
          value={recipe.installCommand ?? ""}
          onChange={(v) => setRecipe((r) => r ? { ...r, installCommand: v || null } : r)}
        />
        <Field
          label="Run Command"
          value={recipe.runCommand ?? ""}
          onChange={(v) => setRecipe((r) => r ? { ...r, runCommand: v || null } : r)}
        />
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono focus:outline-none focus:border-blue-700 transition-colors"
      />
    </div>
  );
}
