"use client";

import { useState } from "react";

interface NotificationSettingsProps {
  initialSettings: Record<string, string>;
}

export function NotificationSettings({ initialSettings }: NotificationSettingsProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);

  async function save(key: string, value: string) {
    setSaving(true);
    setSettings((prev) => ({ ...prev, [key]: value }));
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">Notifications</h2>

      <ToggleSetting
        label="System Notifications"
        description="Show macOS notification center alerts"
        checked={settings.notifications_system === "true"}
        onChange={(v) => save("notifications_system", v ? "true" : "false")}
      />

      <div>
        <label className="text-sm text-gray-400 block mb-1">Telegram Chat ID</label>
        <p className="text-xs text-gray-600 mb-2">Set TELEGRAM_BOT_TOKEN in .env.local, then enter your chat ID here</p>
        <input
          type="text"
          value={settings.telegram_chat_id ?? ""}
          onChange={(e) => save("telegram_chat_id", e.target.value)}
          placeholder="e.g., 123456789"
          className="w-64 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-700"
        />
      </div>

      <div>
        <label className="text-sm text-gray-400 block mb-1">Email Address (for digest)</label>
        <p className="text-xs text-gray-600 mb-2">Set SMTP_* env vars in .env.local for email delivery</p>
        <input
          type="email"
          value={settings.email_address ?? ""}
          onChange={(e) => save("email_address", e.target.value)}
          placeholder="you@example.com"
          className="w-64 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-700"
        />
      </div>

      <div>
        <label className="text-sm text-gray-400 block mb-1">Email Digest Frequency</label>
        <select
          value={settings.email_digest_frequency ?? "weekly"}
          onChange={(e) => save("email_digest_frequency", e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-700"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="off">Off</option>
        </select>
      </div>
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-sm text-gray-300">{label}</span>
        <p className="text-xs text-gray-600">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-gray-700"}`}
      >
        <span className={`block w-4 h-4 rounded-full bg-white transition-transform mx-1 ${checked ? "translate-x-4" : ""}`} />
      </button>
    </div>
  );
}
