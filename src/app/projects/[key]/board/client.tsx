"use client";

import { useState, useEffect, useCallback } from "react";
import { Header, CreateButton } from "@/components/Header";
import { BoardCard } from "@/components/BoardCard";
import { DetailPanel } from "@/components/DetailPanel";
import { CreateWorkItemDialog } from "@/components/CreateWorkItemDialog";
import {
  WORK_ITEM_STATES,
  STATE_LABELS,
  STATE_COLORS,
  type WorkItemState,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

interface WorkItem {
  id: number;
  title: string;
  type: string;
  state: string;
  assignee: string | null;
  parentId: number | null;
  sprintId: number | null;
  priority: number | null;
}

interface Sprint {
  id: number;
  name: string;
  state: string;
}

interface BoardClientProps {
  projectId: number;
  projectKey: string;
  projectName: string;
}

export function BoardClient({
  projectId,
  projectKey,
  projectName,
}: BoardClientProps) {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [parentMap, setParentMap] = useState<Map<number, string>>(new Map());
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [dragOverState, setDragOverState] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    const [sprintsRes, allItemsRes] = await Promise.all([
      fetch(`/api/sprints?projectId=${projectId}&state=active`),
      fetch(`/api/work-items?projectId=${projectId}`),
    ]);

    const sprintsData: Sprint[] = await sprintsRes.json();
    const allItems: WorkItem[] = await allItemsRes.json();
    const sprint = sprintsData[0] ?? null;
    setActiveSprint(sprint);

    const pMap = new Map(allItems.map((i) => [i.id, i.title]));
    setParentMap(pMap);

    const boardItems = sprint
      ? allItems.filter((i) => i.sprintId === sprint.id)
      : allItems;
    setItems(boardItems);
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeRefresh(fetchData);

  async function handleDrop(targetState: string) {
    if (!draggingId) return;
    setDragOverState(null);
    setDraggingId(null);

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === draggingId ? { ...i, state: targetState } : i))
    );

    await fetch(`/api/work-items/${draggingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: targetState }),
    });

    fetchData();
  }

  const columns = WORK_ITEM_STATES.map((state) => ({
    state,
    label: STATE_LABELS[state],
    items: items.filter((i) => i.state === state),
  }));

  return (
    <>
      <Header
        title={projectName}
        subtitle={activeSprint ? activeSprint.name : "Board"}
        actions={
          <CreateButton
            onClick={() => setCreateOpen(true)}
            label="New Item"
          />
        }
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="flex gap-4 h-full">
          {columns.map((col) => (
            <div
              key={col.state}
              className={cn(
                "flex-1 min-w-[200px] flex flex-col rounded-lg transition-colors",
                dragOverState === col.state && "bg-accent/5 ring-2 ring-accent/20"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverState(col.state);
              }}
              onDragLeave={(e) => {
                // Only clear if leaving the column itself, not entering a child
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverState(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(col.state);
              }}
            >
              <div className="flex items-center gap-2 mb-3 px-1">
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
                    STATE_COLORS[col.state as WorkItemState]
                  )}
                >
                  {col.label}
                </span>
                <span className="text-xs text-text-tertiary">
                  {col.items.length}
                </span>
              </div>
              <div className="flex-1 space-y-2.5 px-0.5">
                {col.items.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => {
                      setDraggingId(item.id);
                      e.dataTransfer.effectAllowed = "move";
                      // Make the drag image slightly transparent
                      if (e.currentTarget instanceof HTMLElement) {
                        e.currentTarget.style.opacity = "0.5";
                      }
                    }}
                    onDragEnd={(e) => {
                      setDraggingId(null);
                      setDragOverState(null);
                      if (e.currentTarget instanceof HTMLElement) {
                        e.currentTarget.style.opacity = "1";
                      }
                    }}
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      "cursor-grab active:cursor-grabbing",
                      draggingId === item.id && "opacity-50"
                    )}
                  >
                    <BoardCard
                      id={item.id}
                      title={item.title}
                      type={item.type as "epic" | "feature" | "story"}
                      assignee={item.assignee}
                      projectKey={projectKey}
                      parentTitle={
                        item.parentId
                          ? parentMap.get(item.parentId)
                          : undefined
                      }
                    />
                  </div>
                ))}
                {col.items.length === 0 && (
                  <div className="border border-dashed border-border rounded-lg p-4 text-center text-xs text-text-tertiary">
                    {dragOverState === col.state
                      ? "Drop here"
                      : "No items"}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <DetailPanel
        workItemId={selectedId}
        projectKey={projectKey}
        onClose={() => setSelectedId(null)}
        onUpdated={fetchData}
      />

      <CreateWorkItemDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={projectId}
        projectKey={projectKey}
        onCreated={fetchData}
      />
    </>
  );
}
