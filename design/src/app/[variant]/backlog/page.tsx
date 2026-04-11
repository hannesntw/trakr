"use client";

import { useState } from "react";
import { useStateOverride } from "@/components/StateOverrideContext";
import { MockDetailPanel } from "@/components/MockDetailPanel";

const mockItems = [
  { id: 300, title: "Trakr Core", type: "epic", state: "active", label: "Active", depth: 0 },
  { id: 301, title: "Work Item Management", type: "feature", state: "active", label: "Active", depth: 1 },
  { id: 302, title: "Create Work Item", type: "story", state: "done", label: "Done", depth: 2 },
  { id: 303, title: "View Sprint Board", type: "story", state: "done", label: "Done", depth: 2 },
  { id: 304, title: "Sprint Planning", type: "feature", state: "in_progress", label: "In Progress", depth: 1 },
  { id: 305, title: "Plan Sprint", type: "story", state: "in_progress", label: "In Progress", depth: 2 },
  { id: 306, title: "Create and Manage Sprints", type: "story", state: "ready", label: "Ready", depth: 2 },
];

const typeBadge: Record<string, string> = {
  epic: "text-purple-600 bg-purple-50 border-purple-200",
  feature: "text-blue-600 bg-blue-50 border-blue-200",
  story: "text-emerald-600 bg-emerald-50 border-emerald-200",
};

export default function BacklogPage() {
  const backlogState = useStateOverride("backlog");
  const [selected, setSelected] = useState<typeof mockItems[0] | null>(null);

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Trakr</h1>
        <span className="text-text-tertiary mx-3">/</span>
        <span className="text-sm text-text-secondary">Backlog</span>
      </header>
      <div className="flex-1 overflow-auto">
        {backlogState === "empty" ? (
          <div className="text-center py-20 text-sm text-text-tertiary">Backlog is empty.</div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-content-bg z-10">
              <tr className="border-b border-border text-left">
                <th className="px-6 py-2.5 text-xs font-medium text-text-tertiary uppercase w-16">ID</th>
                <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase w-24">Type</th>
                <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase">Title</th>
                <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase w-28">State</th>
              </tr>
            </thead>
            <tbody>
              {mockItems.map((item) => (
                <tr key={item.id} onClick={() => setSelected(item)} className="border-b border-border/50 hover:bg-surface transition-colors cursor-pointer">
                  <td className="px-6 py-2.5 text-xs text-text-tertiary font-mono">#{item.id}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${typeBadge[item.type]}`}>
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sm" style={{ paddingLeft: `${12 + item.depth * 20}px` }}>
                    {item.title}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-text-secondary">{item.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <MockDetailPanel
          itemId={selected.id}
          title={selected.title}
          type={selected.type}
          state={selected.state}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
