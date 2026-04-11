"use client";

import { useState } from "react";
import { useVariant } from "@/components/VariantContext";
import { useStateOverride } from "@/components/StateOverrideContext";
import { MockDetailPanel } from "@/components/MockDetailPanel";

const states = [
  { key: "new", label: "New", color: "text-gray-600 bg-gray-50 border-gray-200" },
  { key: "active", label: "Active", color: "text-blue-600 bg-blue-50 border-blue-200" },
  { key: "ready", label: "Ready", color: "text-amber-600 bg-amber-50 border-amber-200" },
  { key: "in_progress", label: "In Progress", color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { key: "done", label: "Done", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
];

const mockCards = [
  { id: 1, title: "Create Work Item", type: "story", state: "done", assignee: "Sam T." },
  { id: 2, title: "View Sprint Board", type: "story", state: "done", assignee: "Sam T." },
  { id: 3, title: "View Backlog Table", type: "story", state: "done", assignee: "Morgan L." },
  { id: 4, title: "View Work Item Detail", type: "story", state: "in_progress", assignee: "Sam T." },
  { id: 5, title: "Plan Sprint", type: "story", state: "in_progress", assignee: "Morgan L." },
  { id: 6, title: "Create and Manage Sprints", type: "story", state: "ready", assignee: "Sam T." },
  { id: 7, title: "Add and View Comments", type: "story", state: "new", assignee: "Morgan L." },
];

const typeDot: Record<string, string> = { epic: "bg-purple-500", feature: "bg-blue-500", story: "bg-emerald-500" };

export default function BoardPage() {
  const variant = useVariant();
  const boardState = useStateOverride("board");
  const [selected, setSelected] = useState<typeof mockCards[0] | null>(null);

  return (
    <>
      <header className="h-14 px-6 flex items-center justify-between border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-text-primary">Trakr</h1>
          <span className="text-text-tertiary">/</span>
          <span className="text-sm text-text-secondary">Board</span>
        </div>
        {variant.features.sprintCapacity && (
          <div className="text-xs text-text-secondary">
            Capacity: <strong className="text-text-primary">24/30 pts</strong>
          </div>
        )}
      </header>
      <div className="flex-1 overflow-auto p-6">
        {boardState === "empty" ? (
          <div className="text-center py-20 text-sm text-text-tertiary">No items in this sprint.</div>
        ) : boardState === "loading" ? (
          <div className="text-center py-20 text-sm text-text-tertiary">Loading board...</div>
        ) : (
          <div className="flex gap-4 h-full">
            {states.map((col) => {
              const items = mockCards.filter((c) => c.state === col.key);
              return (
                <div key={col.key} className="flex-1 min-w-[180px] flex flex-col">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${col.color}`}>
                      {col.label}
                    </span>
                    <span className="text-xs text-text-tertiary">{items.length}</span>
                  </div>
                  <div className="flex-1 space-y-2.5">
                    {items.map((item) => (
                      <div key={item.id} onClick={() => setSelected(item)} className="bg-surface border border-border rounded-lg p-3 hover:border-border-hover transition-colors cursor-pointer">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${typeDot[item.type]}`} />
                          <span className="text-xs text-text-tertiary">Story</span>
                          <span className="text-xs text-text-tertiary ml-auto">#{item.id}</span>
                        </div>
                        <p className="text-sm font-medium text-text-primary">{item.title}</p>
                        <p className="text-xs text-text-secondary mt-1">{item.assignee}</p>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div className="border border-dashed border-border rounded-lg p-4 text-center text-xs text-text-tertiary">No items</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
