"use client";

import { useState } from "react";
import { useVariant } from "@/components/VariantContext";
import { useStateOverride } from "@/components/StateOverrideContext";
import { MockDetailPanel } from "@/components/MockDetailPanel";
import { Bug, CheckSquare, Square } from "lucide-react";

const states = [
  { key: "new", label: "New", color: "text-gray-600 bg-gray-50 border-gray-200" },
  { key: "active", label: "Active", color: "text-blue-600 bg-blue-50 border-blue-200" },
  { key: "ready", label: "Ready", color: "text-amber-600 bg-amber-50 border-amber-200" },
  { key: "in_progress", label: "In Progress", color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { key: "done", label: "Done", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
];

interface Task {
  id: number;
  title: string;
  done: boolean;
}

interface Card {
  id: number;
  title: string;
  type: "story" | "bug" | "task";
  state: string;
  assignee: string | null;
  parentTitle: string | null;
  tasks?: Task[]; // child tasks for stories
}

const mockCards: Card[] = [
  { id: 7, title: "Add and View Comments", type: "story", state: "new", assignee: "Morgan L.", parentTitle: null, tasks: [] },
  { id: 8, title: "Board cards misaligned on Safari", type: "bug", state: "active", assignee: "Sam T.", parentTitle: "Work Item Management" },
  { id: 6, title: "Create and Manage Sprints", type: "story", state: "ready", assignee: "Sam T.", parentTitle: null, tasks: [
    { id: 11, title: "Update API docs", done: false },
  ]},
  { id: 4, title: "View Work Item Detail", type: "story", state: "in_progress", assignee: "Sam T.", parentTitle: null, tasks: [
    { id: 14, title: "Add markdown preview", done: true },
    { id: 15, title: "Wire up inline editing", done: false },
    { id: 16, title: "Connect attachment gallery", done: false },
  ]},
  { id: 5, title: "Plan Sprint", type: "story", state: "in_progress", assignee: "Morgan L.", parentTitle: null, tasks: [
    { id: 10, title: "Write unit tests for drag-and-drop", done: false },
    { id: 17, title: "Add capacity bar to sprint header", done: true },
  ]},
  { id: 9, title: "Sprint dates off by one day", type: "bug", state: "in_progress", assignee: "Morgan L.", parentTitle: "Sprint Planning" },
  // Standalone tasks (no parent story)
  { id: 12, title: "Review PR #47", type: "task", state: "new", assignee: "Morgan L.", parentTitle: null },
  { id: 13, title: "Set up staging environment", type: "task", state: "done", assignee: "Sam T.", parentTitle: null },
  { id: 1, title: "Create Work Item", type: "story", state: "done", assignee: "Sam T.", parentTitle: null, tasks: [] },
  { id: 2, title: "View Sprint Board", type: "story", state: "done", assignee: "Sam T.", parentTitle: null, tasks: [] },
  { id: 3, title: "View Backlog Table", type: "story", state: "done", assignee: "Morgan L.", parentTitle: null, tasks: [] },
];

const typeDot: Record<string, string> = { story: "bg-emerald-500", bug: "bg-red-500", task: "bg-slate-400" };
const typeLabel: Record<string, string> = { story: "Story", bug: "Bug", task: "Task" };

export default function BoardPage() {
  const variant = useVariant();
  const boardState = useStateOverride("board");
  const [selected, setSelected] = useState<Card | null>(null);
  const [taskStates, setTaskStates] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = { 13: true }; // standalone task done
    mockCards.forEach(c => c.tasks?.forEach(t => { init[t.id] = t.done; }));
    return init;
  });

  function toggleTask(taskId: number) {
    setTaskStates(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  }

  return (
    <>
      <header className="h-14 px-6 flex items-center justify-between border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-text-primary">Trakr</h1>
          <span className="text-text-tertiary">/</span>
          <span className="text-sm text-text-secondary">Board</span>
        </div>
      </header>
      <div className="flex-1 overflow-auto p-6">
        {boardState === "empty" ? (
          <div className="text-center py-20 text-sm text-text-tertiary">No items in this sprint.</div>
        ) : boardState === "loading" ? (
          <div className="text-center py-20 text-sm text-text-tertiary">Loading board...</div>
        ) : (
          <div className="flex gap-4 h-full">
            {states.map((col) => {
              const items = mockCards.filter(c => {
                // Standalone tasks that are checked move to done
                if (c.type === "task" && taskStates[c.id]) return col.key === "done";
                if (c.type === "task" && !taskStates[c.id] && c.state !== "done") return c.state === col.key;
                return c.state === col.key;
              });
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
                      <div key={item.id}
                        onClick={() => setSelected(item)}
                        className={`bg-surface border rounded-lg p-3 hover:border-border-hover transition-colors cursor-pointer ${
                          item.type === "bug" ? "border-red-200" : "border-border"
                        }`}>
                        {/* Type badge */}
                        <div className="flex items-center gap-1.5 mb-1.5">
                          {item.type === "bug" ? (
                            <Bug className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          ) : item.type === "task" ? (
                            <button onClick={e => { e.stopPropagation(); toggleTask(item.id); }} className="shrink-0">
                              {taskStates[item.id] ? <CheckSquare className="w-3.5 h-3.5 text-emerald-500" /> : <Square className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500" />}
                            </button>
                          ) : (
                            <span className={`w-1.5 h-1.5 rounded-full ${typeDot[item.type]} shrink-0`} />
                          )}
                          <span className={`text-xs ${item.type === "bug" ? "text-red-500" : "text-text-tertiary"}`}>
                            {typeLabel[item.type]}
                          </span>
                          <span className="text-xs text-text-tertiary ml-auto">#{item.id}</span>
                        </div>

                        {/* Title */}
                        {item.type === "task" ? (
                          <p className={`text-sm font-medium ${taskStates[item.id] ? "line-through text-text-tertiary" : "text-text-primary"}`}>
                            {item.title}
                          </p>
                        ) : (
                          <p className="text-sm font-medium text-text-primary">{item.title}</p>
                        )}

                        {/* Child tasks checklist (for stories) */}
                        {item.tasks && item.tasks.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                            <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">
                              Tasks {item.tasks.filter(t => taskStates[t.id]).length}/{item.tasks.length}
                            </p>
                            {item.tasks.map(task => (
                              <div key={task.id} className="flex items-center gap-1.5">
                                <button onClick={e => { e.stopPropagation(); toggleTask(task.id); }} className="shrink-0">
                                  {taskStates[task.id] ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500" />
                                  )}
                                </button>
                                <span className={`text-xs ${taskStates[task.id] ? "line-through text-text-tertiary" : "text-text-primary"}`}>
                                  {task.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {item.parentTitle && (
                          <p className="text-xs text-text-tertiary mt-1 truncate">{item.parentTitle}</p>
                        )}
                        {item.assignee && !item.tasks?.length && (
                          <p className="text-xs text-text-secondary mt-1">{item.assignee}</p>
                        )}
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
