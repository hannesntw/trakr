"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Header, CreateButton } from "@/components/Header";
import { DetailPanel } from "@/components/DetailPanel";
import { CreateWorkItemDialog } from "@/components/CreateWorkItemDialog";
import { TypeBadge, StateBadge, IdBadge } from "@/components/Badge";
import { PointsBadge } from "@/components/PointsBadge";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { Search, X, Circle, ArrowUpCircle, CheckCircle2, Loader2, Timer, User, Eye, EyeOff, GripVertical } from "lucide-react";
import { FilterChip } from "@/components/FilterChip";
import { Combobox, type ComboboxOption } from "@/components/Combobox";
import { cn } from "@/lib/utils";
import {
  WORK_ITEM_TYPES,
  TYPE_LABELS,
  type WorkItemType,
  type WorkflowState,
} from "@/lib/constants";

interface WorkItem {
  id: string;
  displayId: string | null;
  title: string;
  type: string;
  state: string;
  assignee: string | null;
  parentId: string | null;
  sprintId: string | null;
  priority: number | null;
  points: number | null;
}

interface Sprint {
  id: string;
  name: string;
}

interface BacklogClientProps {
  projectId: string;
  projectKey: string;
  projectName: string;
  makerMode?: boolean;
}

/* ─── State icon mapping (category-based) ─── */
const CATEGORY_ICONS: Record<string, typeof Circle> = {
  todo: Circle,
  in_progress: Loader2,
  done: CheckCircle2,
};

const CATEGORY_ICON_COLORS: Record<string, string> = {
  todo: "text-gray-400",
  in_progress: "text-indigo-500",
  done: "text-emerald-500",
};

function StateIcon({ state, workflowStates }: { state: string; workflowStates?: WorkflowState[] }) {
  const ws = workflowStates?.find((w) => w.slug === state);
  const category = ws?.category ?? "todo";
  const Icon = CATEGORY_ICONS[category] ?? Circle;
  return <Icon className={cn("w-3.5 h-3.5", CATEGORY_ICON_COLORS[category] ?? "text-gray-400")} />;
}

/* ─── Main component ─── */
export function BacklogClient({
  projectId,
  projectKey,
  projectName,
  makerMode,
}: BacklogClientProps) {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [sprintMap, setSprintMap] = useState<Map<string, string>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<WorkItemType>>(new Set());
  const [stateFilter, setStateFilter] = useState<Set<string>>(new Set());
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [members, setMembers] = useState<ComboboxOption[]>([]);
  const [workflowStates, setWorkflowStates] = useState<WorkflowState[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [initialFilterApplied, setInitialFilterApplied] = useState(false);

  // Drag-to-reparent state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropValid, setDropValid] = useState(false);

  const fetchData = useCallback(async () => {
    const [itemsRes, sprintsRes, membersRes, wfRes] = await Promise.all([
      fetch(`/api/work-items?projectId=${projectId}`),
      fetch(`/api/sprints?projectId=${projectId}`),
      fetch(`/api/projects/${projectId}/members`),
      fetch(`/api/projects/${projectId}/workflow`),
    ]);

    const allItems: WorkItem[] = await itemsRes.json();
    const allSprints: Sprint[] = await sprintsRes.json();

    setItems(allItems);
    setSprintMap(new Map(allSprints.map((s) => [s.id, s.name])));

    if (membersRes.ok) {
      const m: { id: string; name: string | null; email: string | null }[] = await membersRes.json();
      setMembers(m.map((u) => ({
        value: u.name ?? u.email ?? u.id,
        label: u.name ?? "Unknown",
        secondary: u.email ?? undefined,
        icon: (
          <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold flex items-center justify-center shrink-0">
            {(u.name ?? "?").charAt(0)}
          </span>
        ),
      })));
    }

    if (wfRes.ok) setWorkflowStates(await wfRes.json());
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const changedIds = useRealtimeRefresh(fetchData);

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleCreate = () => setCreateOpen(true);
    const handleClose = () => {
      setCreateOpen(false);
      setSelectedId(null);
    };
    window.addEventListener("stori:create-item", handleCreate);
    window.addEventListener("stori:close-panel", handleClose);
    return () => {
      window.removeEventListener("stori:create-item", handleCreate);
      window.removeEventListener("stori:close-panel", handleClose);
    };
  }, []);

  // On first load, pre-select all non-done states to hide completed items
  useEffect(() => {
    if (workflowStates.length > 0 && !initialFilterApplied) {
      const nonDoneSlugs = workflowStates
        .filter((ws) => ws.category !== "done")
        .map((ws) => ws.slug);
      setStateFilter(new Set(nonDoneSlugs));
      setInitialFilterApplied(true);
    }
  }, [workflowStates, initialFilterApplied]);

  // Members are fetched in fetchData and stored in `members` state

  // Apply filters — also compute ghost parent IDs (done parents with visible descendants)
  const { filteredItems, ghostParentIds } = useMemo(() => {
    // First pass: determine which items pass the filters normally
    const passing = new Set<string>();
    for (const item of items) {
      let passes = true;
      // Text search — match title or displayId
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchId = (item.displayId ?? `#${item.id}`).toLowerCase().includes(q) || String(item.id).includes(q);
        if (!matchTitle && !matchId) passes = false;
      }
      if (passes && typeFilter.size > 0 && !typeFilter.has(item.type as WorkItemType))
        passes = false;
      if (passes && stateFilter.size > 0 && !stateFilter.has(item.state))
        passes = false;
      if (passes && assigneeFilter) {
        if (item.assignee !== assigneeFilter) passes = false;
      }
      if (passes) passing.add(item.id);
    }

    // Second pass: when hiding done items, find ghost parents.
    // A ghost parent is a done item that is NOT in `passing` but has a
    // descendant that IS in `passing`. Walk up the parent chain of every
    // visible item and mark ancestors that were filtered out due to being done.
    const ghostIds = new Set<string>();
    if (!showCompleted && workflowStates.length > 0) {
      const doneSlugs = new Set(
        workflowStates.filter((ws) => ws.category === "done").map((ws) => ws.slug)
      );
      const itemById = new Map(items.map((i) => [i.id, i]));

      for (const id of passing) {
        let current = itemById.get(id);
        while (current?.parentId) {
          const parent = itemById.get(current.parentId);
          if (!parent) break;
          if (!passing.has(parent.id) && doneSlugs.has(parent.state)) {
            ghostIds.add(parent.id);
          }
          current = parent;
        }
      }
    }

    // Combine passing items + ghost parents
    const allVisible = items.filter((i) => passing.has(i.id) || ghostIds.has(i.id));
    return { filteredItems: allVisible, ghostParentIds: ghostIds };
  }, [items, searchQuery, typeFilter, stateFilter, assigneeFilter, showCompleted, workflowStates]);

  const hasActiveFilters =
    searchQuery.length > 0 ||
    typeFilter.size > 0 ||
    (showCompleted ? stateFilter.size > 0 : false) ||
    assigneeFilter !== null;

  function clearAllFilters() {
    setSearchQuery("");
    setTypeFilter(new Set());
    if (showCompleted) {
      setStateFilter(new Set());
    } else {
      // Re-apply the default non-done filter
      const nonDoneSlugs = workflowStates
        .filter((ws) => ws.category !== "done")
        .map((ws) => ws.slug);
      setStateFilter(new Set(nonDoneSlugs));
    }
    setAssigneeFilter(null);
  }

  function toggleShowCompleted() {
    if (showCompleted) {
      // Hiding completed: set filter to non-done states
      const nonDoneSlugs = workflowStates
        .filter((ws) => ws.category !== "done")
        .map((ws) => ws.slug);
      setStateFilter(new Set(nonDoneSlugs));
      setShowCompleted(false);
    } else {
      // Showing completed: clear state filter
      setStateFilter(new Set());
      setShowCompleted(true);
    }
  }

  function toggleInSet<T>(set: Set<T>, value: T, setter: (s: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  // Valid parent types for drag-to-reparent
  const VALID_PARENTS: Record<string, string[]> = {
    feature: ["epic"],
    story: ["feature"],
    bug: ["feature"],
    task: ["story", "bug"],
    epic: [],
  };

  // Sort items hierarchically
  const itemMap = new Map(filteredItems.map((i) => [i.id, i]));
  const allItemMap = new Map(items.map((i) => [i.id, i]));

  function getDepth(item: WorkItem): number {
    if (!item.parentId) return 0;
    const parent = allItemMap.get(item.parentId);
    return parent ? 1 + getDepth(parent) : 0;
  }

  function sortHierarchically(items: WorkItem[]): WorkItem[] {
    const itemIds = new Set(items.map((i) => i.id));
    const roots = items.filter(
      (i) => !i.parentId || !itemIds.has(i.parentId)
    );
    const childrenOf = (parentId: string) =>
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
    for (const root of roots.sort(
      (a, b) => (a.priority ?? 0) - (b.priority ?? 0)
    )) {
      walk(root);
    }
    return result;
  }

  function canBeParent(dragItem: WorkItem, targetItem: WorkItem): boolean {
    const validTypes = VALID_PARENTS[dragItem.type] ?? [];
    if (!validTypes.includes(targetItem.type)) return false;
    // Prevent circular reference: can't drop on own descendant
    let current: WorkItem | undefined = targetItem;
    while (current) {
      if (current.id === dragItem.id) return false;
      current = current.parentId ? allItemMap.get(current.parentId) : undefined;
    }
    return true;
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, targetItem: WorkItem) {
    e.preventDefault();
    if (dragId === null || dragId === targetItem.id) return;
    const dragItem = allItemMap.get(dragId);
    if (!dragItem) return;
    const valid = canBeParent(dragItem, targetItem);
    setDropTargetId(targetItem.id);
    setDropValid(valid);
  }

  async function handleDrop(targetItem: WorkItem) {
    if (dragId === null) return;
    const dragItem = allItemMap.get(dragId);
    if (!dragItem || !canBeParent(dragItem, targetItem)) {
      setDragId(null);
      setDropTargetId(null);
      setDropValid(false);
      return;
    }
    // Optimistically update local state
    setItems((prev) =>
      prev.map((i) => (i.id === dragId ? { ...i, parentId: targetItem.id } : i))
    );
    setDragId(null);
    setDropTargetId(null);
    setDropValid(false);
    // Persist via API
    await fetch(`/api/work-items/${dragId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: targetItem.id }),
    });
    fetchData();
  }

  function handleDragEnd() {
    setDragId(null);
    setDropTargetId(null);
    setDropValid(false);
  }

  const sortedItems = sortHierarchically(filteredItems);

  return (
    <>
      <Header
        title={projectName}
        subtitle="Backlog"
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-tertiary">
              {filteredItems.length}
              {filteredItems.length !== items.length && ` / ${items.length}`}
              {" "}items
            </span>
            <CreateButton
              onClick={() => setCreateOpen(true)}
              label="New Item"
            />
          </div>
        }
      />

      {/* Filter bar */}
      <div className="px-6 py-2.5 flex items-center gap-2 border-b border-border bg-surface shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or ID..."
            className="h-8 pl-8 pr-3 w-56 rounded-md border border-border bg-content-bg text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
          />
        </div>

        <FilterChip
          label="Type"
          options={WORK_ITEM_TYPES}
          selected={typeFilter}
          onToggle={(v) => toggleInSet(typeFilter, v, setTypeFilter)}
          labelMap={TYPE_LABELS}
        />

        <FilterChip
          label="State"
          options={workflowStates.map((ws) => ws.slug)}
          selected={stateFilter}
          onToggle={(v) => toggleInSet(stateFilter, v, setStateFilter)}
          labelMap={Object.fromEntries(workflowStates.map((ws) => [ws.slug, ws.displayName])) as Record<string, string>}
        />

        {members.length > 0 && (
          <div className="w-44">
            <Combobox
              options={members}
              value={assigneeFilter}
              onChange={setAssigneeFilter}
              placeholder="Assignee"
              searchPlaceholder="Search members..."
              clearLabel="Clear filter"
            />
          </div>
        )}

        <button
          onClick={toggleShowCompleted}
          className={cn(
            "h-8 inline-flex items-center gap-1.5 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer",
            showCompleted
              ? "border border-accent bg-accent-light text-accent"
              : "border border-border bg-surface text-text-secondary hover:border-border-hover"
          )}
        >
          {showCompleted ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showCompleted ? "Hide completed" : "Show completed"}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="h-8 inline-flex items-center gap-1 px-2.5 rounded-md text-xs text-text-secondary hover:text-text-primary hover:bg-content-bg transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-content-bg z-10">
            <tr className="border-b border-border text-left">
              <th className="w-8" />
              <th className="px-6 py-2.5 text-xs font-medium text-text-tertiary uppercase tracking-wider w-16">
                ID
              </th>
              <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase tracking-wider w-24">
                Type
              </th>
              <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase tracking-wider">
                Title
              </th>
              <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase tracking-wider w-12 text-center">
                Pts
              </th>
              <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase tracking-wider w-28">
                State
              </th>
              {!makerMode && (
                <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase tracking-wider w-48">
                  Sprint
                </th>
              )}
              <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase tracking-wider w-36">
                Assignee
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => {
              const depth = getDepth(item);
              const isDragging = dragId === item.id;
              const isDropTarget = dropTargetId === item.id && dragId !== null;
              const canDrag = item.type !== "epic";
              const isGhostParent = ghostParentIds.has(item.id);
              return (
                <tr
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  draggable={canDrag}
                  onDragStart={(e) => canDrag && handleDragStart(e, item.id)}
                  onDragOver={(e) => handleDragOver(e, item)}
                  onDragLeave={() => { setDropTargetId(null); setDropValid(false); }}
                  onDrop={() => handleDrop(item)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "border-b transition-colors cursor-pointer group",
                    isGhostParent
                      ? "opacity-40 border-border/50"
                      : isDragging
                        ? "opacity-40 border-border/50"
                        : isDropTarget && dropValid
                          ? "bg-accent/10 border-accent/30"
                          : isDropTarget && !dropValid
                            ? "bg-red-50 border-red-200"
                            : "border-border/50 hover:bg-surface",
                    changedIds.has(item.id) && "realtime-highlight"
                  )}
                >
                  <td className="pl-2 py-2.5 w-8">
                    {canDrag && (
                      <GripVertical className="w-3.5 h-3.5 text-text-tertiary/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                    )}
                  </td>
                  <td className="px-6 py-2.5">
                    <IdBadge id={item.id} displayId={item.displayId} />
                  </td>
                  <td className="px-3 py-2.5">
                    <TypeBadge type={item.type as WorkItemType} />
                  </td>
                  <td className="px-3 py-2.5 max-w-0">
                    <span
                      className="text-sm text-text-primary group-hover:text-accent transition-colors block truncate"
                      style={{ paddingLeft: `${depth * 20}px` }}
                    >
                      {isDropTarget && dropValid && (
                        <span className="text-[10px] text-accent mr-2">+ Move here</span>
                      )}
                      {isDropTarget && !dropValid && (
                        <span className="text-[10px] text-red-500 mr-2">Invalid parent</span>
                      )}
                      {item.title}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {(item.type === "story" || item.type === "bug") && item.points != null ? (
                      <PointsBadge points={item.points} className="inline-block" />
                    ) : (
                      <span className="text-xs text-text-tertiary">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <StateIcon state={item.state} workflowStates={workflowStates} />
                      <StateBadge state={item.state} workflowStates={workflowStates} />
                    </div>
                  </td>
                  {!makerMode && (
                    <td className="px-3 py-2.5 text-xs text-text-secondary truncate">
                      {item.sprintId ? sprintMap.get(item.sprintId) : "—"}
                    </td>
                  )}
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
