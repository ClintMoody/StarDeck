"use client";

import { useState } from "react";
import { ActivityItem } from "./activity-item";

interface ActivityEntry {
  type: string;
  repoId: number | null;
  repoName: string;
  title: string | null;
  detail: string | null;
  date: string | null;
}

interface ActivityFeedProps {
  activities: ActivityEntry[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="w-10 flex-shrink-0 border-l border-gray-800">
        <button
          onClick={() => setCollapsed(false)}
          className="w-full py-4 text-gray-500 hover:text-gray-300 transition-colors"
          title="Show activity feed"
        >
          <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <aside className="w-64 flex-shrink-0 border-l border-gray-800 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Activity
        </h3>
        <button
          onClick={() => setCollapsed(true)}
          className="text-gray-600 hover:text-gray-400 transition-colors"
          title="Collapse activity feed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="p-3 space-y-1">
        {activities.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-8">
            No recent activity
          </p>
        ) : (
          activities.map((activity, i) => (
            <ActivityItem
              key={`${activity.type}-${activity.repoId}-${i}`}
              type={activity.type}
              repoName={activity.repoName}
              title={activity.title}
              detail={activity.detail}
              date={activity.date}
            />
          ))
        )}
      </div>
    </aside>
  );
}
