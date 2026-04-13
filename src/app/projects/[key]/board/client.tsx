"use client";

import { useState, useEffect, useCallback } from "react";
import { Header, CreateButton } from "@/components/Header";
import { BoardCard, type GitHubStatus } from "@/components/BoardCard";
import { DetailPanel } from "@/components/DetailPanel";
import { CreateWorkItemDialog } from "@/components/CreateWorkItemDialog";
import type { WorkflowState } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

interface WorkItem {
  id: number;
  displayId: string | null;
  title: string;
  type: string;
  state: string;
  assignee: string | null;
  parentId: number | null;
  sprintId: number | null;
  priority: number | null;
  points: number | null;
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
  const [workflowStates, setWorkflowStates] = useState<WorkflowState[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [dragOverState, setDragOverState] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [githubStatusMap, setGithubStatusMap] = useState<Record<number, GitHubStatus>>({});

  const fetchData = useCallback(async () => {
    const [sprintsRes, allItemsRes, wfRes, ghRes] = await Promise.all([
      fetch(`/api/sprints?projectId=${projectId}&state=active`),
      fetch(`/api/work-items?projectId=${projectId}`),
      fetch(`/api/projects/${projectId}/workflow`),
      fetch(`/api/projects/${projectId}/github/status`),
    ]);

    const sprintsData: Sprint[] = await sprintsRes.json();
    const allItems: WorkItem[] = await allItemsRes.json();
    if (wfRes.ok) setWorkflowStates(await wfRes.json());
    if (ghRes.ok) {
      const ghData = await ghRes.json();
      if (ghData.linked && ghData.items) {
        setGithubStatusMap(ghData.items);
      } else {
        setGithubStatusMap({});
      }
    }
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

  const changedIds = useRealtimeRefresh(fetchData);

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

  /** Category-based colors for column headers */
  const CATEGORY_COLORS: Record<string, string> = {
    todo: "text-gray-600 bg-gray-50 border-gray-200",
    in_progress: "text-indigo-600 bg-indigo-50 border-indigo-200",
    done: "text-emerald-600 bg-emerald-50 border-emerald-200",
  };

  const columns = workflowStates.map((ws) => ({
    state: ws.slug,
    label: ws.displayName,
    color: CATEGORY_COLORS[ws.category] ?? "text-gray-600 bg-gray-50 border-gray-200",
    items: items.filter((i) => i.state === ws.slug),
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
                    col.color
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
                      draggingId === item.id && "opacity-50",
                      changedIds.has(item.id) && "realtime-highlight"
                    )}
                  >
                    <BoardCard
                      id={item.id}
                      displayId={item.displayId}
                      title={item.title}
                      type={item.type as "epic" | "feature" | "story"}
                      assignee={item.assignee}
                      projectKey={projectKey}
                      parentTitle={
                        item.parentId
                          ? parentMap.get(item.parentId)
                          : undefined
                      }
                      points={item.points}
                      github={githubStatusMap[item.id] ?? null}
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
        projectId={projectId}
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
