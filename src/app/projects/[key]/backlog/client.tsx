"use client";

import { useState, useEffect, useCallback } from "react";
import { Header, CreateButton } from "@/components/Header";
import { DetailPanel } from "@/components/DetailPanel";
import { CreateWorkItemDialog } from "@/components/CreateWorkItemDialog";
import { TypeBadge, StateBadge, IdBadge } from "@/components/Badge";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import type { WorkItemType, WorkItemState } from "@/lib/constants";

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
}

interface BacklogClientProps {
  projectId: number;
  projectKey: string;
  projectName: string;
}

export function BacklogClient({
  projectId,
  projectKey,
  projectName,
}: BacklogClientProps) {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [sprintMap, setSprintMap] = useState<Map<number, string>>(new Map());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchData = useCallback(async () => {
    const [itemsRes, sprintsRes] = await Promise.all([
      fetch(`/api/work-items?projectId=${projectId}`),
      fetch(`/api/sprints?projectId=${projectId}`),
    ]);

    const allItems: WorkItem[] = await itemsRes.json();
    const allSprints: Sprint[] = await sprintsRes.json();

    setItems(allItems);
    setSprintMap(new Map(allSprints.map((s) => [s.id, s.name])));
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeRefresh(fetchData);

  // Sort items hierarchically
  const itemMap = new Map(items.map((i) => [i.id, i]));

  function getDepth(item: WorkItem): number {
    if (!item.parentId) return 0;
    const parent = itemMap.get(item.parentId);
    return parent ? 1 + getDepth(parent) : 0;
  }

  function sortHierarchically(items: WorkItem[]): WorkItem[] {
    const roots = items.filter((i) => !i.parentId);
    const childrenOf = (parentId: number) =>
      items
        .filter((i) => i.parentId === parentId)
        .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

    const result: WorkItem[] = [];
    function walk(item: WorkItem) {
      result.push(item);
      for (const child of childrenOf(item.id)) {
        walk(child);
      }
    }
    for (const root of roots) {
      walk(root);
    }
    return result;
  }

  const sortedItems = sortHierarchically(items);

  return (
    <>
      <Header
        title={projectName}
        subtitle="Backlog"
        actions={
          <CreateButton
            onClick={() => setCreateOpen(true)}
            label="New Item"
          />
        }
      />
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-content-bg z-10">
            <tr className="border-b border-border text-left">
              <th className="px-6 py-2.5 text-xs font-medium text-text-tertiary uppercase tracking-wider w-16">
                ID
              </th>
              <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase tracking-wider w-24">
                Type
              </th>
              <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase tracking-wider">
                Title
              </th>
              <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase tracking-wider w-28">
                State
              </th>
              <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase tracking-wider w-48">
                Sprint
              </th>
              <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase tracking-wider w-36">
                Assignee
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => {
              const depth = getDepth(item);
              return (
                <tr
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className="border-b border-border/50 hover:bg-surface transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-2.5">
                    <IdBadge id={item.id} />
                  </td>
                  <td className="px-3 py-2.5">
                    <TypeBadge type={item.type as WorkItemType} />
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className="text-sm text-text-primary group-hover:text-accent transition-colors"
                      style={{ paddingLeft: `${depth * 20}px` }}
                    >
                      {item.title}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <StateBadge state={item.state as WorkItemState} />
                  </td>
                  <td className="px-3 py-2.5 text-xs text-text-secondary truncate">
                    {item.sprintId ? sprintMap.get(item.sprintId) : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    {item.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold flex items-center justify-center shrink-0">
                          {item.assignee
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                        <span className="text-xs text-text-secondary truncate">
                          {item.assignee}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-text-tertiary">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
