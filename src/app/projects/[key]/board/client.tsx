"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header, CreateButton } from "@/components/Header";
import { BoardCard, type GitHubStatus } from "@/components/BoardCard";
import { DetailPanel } from "@/components/DetailPanel";
import { CreateWorkItemDialog } from "@/components/CreateWorkItemDialog";
import type { WorkflowState } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { ChevronDown, ChevronRight, Filter, Rows3 } from "lucide-react";

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

// --- TRK-136: Card rule types (conditional styling) ---
type CardRule = {
  label: string;
  match: (item: WorkItem, workflowStates: WorkflowState[]) => boolean;
  borderClass: string;
};

const CARD_RULES: CardRule[] = [
  {
    label: "Bug",
    match: (item) => item.type === "bug",
    borderClass: "border-l-4 border-l-red-500",
  },
  {
    label: "High effort (8+)",
    match: (item) => item.points != null && item.points >= 8,
    borderClass: "border-l-4 border-l-amber-500",
  },
  {
    label: "Almost done",
    match: (item, wfStates) => {
      // Item is in the last column before "done" category
      const doneStates = wfStates.filter((s) => s.category === "done");
      const firstDonePos = doneStates.length > 0 ? Math.min(...doneStates.map((s) => s.position)) : Infinity;
      const preDoneStates = wfStates.filter((s) => s.category !== "done");
      if (preDoneStates.length === 0) return false;
      const lastPreDone = preDoneStates.reduce((a, b) => (a.position > b.position ? a : b));
      return item.state === lastPreDone.slug && lastPreDone.position < firstDonePos;
    },
    borderClass: "border-l-4 border-l-emerald-500",
  },
];

function getCardRuleClass(item: WorkItem, wfStates: WorkflowState[]): string {
  for (const rule of CARD_RULES) {
    if (rule.match(item, wfStates)) return rule.borderClass;
  }
  return "";
}

// --- TRK-135: Swimlane types ---
type SwimlaneSetting = "none" | "assignee" | "parent" | "type";

const SWIMLANE_OPTIONS: { value: SwimlaneSetting; label: string }[] = [
  { value: "none", label: "None" },
  { value: "assignee", label: "By assignee" },
  { value: "parent", label: "By parent" },
  { value: "type", label: "By type" },
];

export function BoardClient({
  projectId,
  projectKey,
  projectName,
}: BoardClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [items, setItems] = useState<WorkItem[]>([]);
  const [parentMap, setParentMap] = useState<Map<number, string>>(new Map());
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [workflowStates, setWorkflowStates] = useState<WorkflowState[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [dragOverState, setDragOverState] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [githubStatusMap, setGithubStatusMap] = useState<Record<number, GitHubStatus>>({});

  // TRK-137: Type filter — hide epics/features by default
  const [hideContainers, setHideContainers] = useState(true);

  // TRK-135: Swimlane state from URL
  const swimlaneParam = (searchParams.get("swimlane") ?? "none") as SwimlaneSetting;
  const [swimlane, setSwimlane] = useState<SwimlaneSetting>(swimlaneParam);
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set());
  const [swimlaneDropdownOpen, setSwimlaneDropdownOpen] = useState(false);

  function updateSwimlane(value: SwimlaneSetting) {
    setSwimlane(value);
    setSwimlaneDropdownOpen(false);
    setCollapsedLanes(new Set());
    const params = new URLSearchParams(searchParams.toString());
    if (value === "none") {
      params.delete("swimlane");
    } else {
      params.set("swimlane", value);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function toggleLane(key: string) {
    setCollapsedLanes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

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

  // TRK-137: Filtered items (hide epics/features when toggle is on)
  const filteredItems = useMemo(() => {
    if (!hideContainers) return items;
    return items.filter((i) => i.type !== "epic" && i.type !== "feature");
  }, [items, hideContainers]);

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

  // TRK-135: Compute swimlane groups
  const swimlaneGroups = useMemo(() => {
    if (swimlane === "none") return null;

    const groups = new Map<string, WorkItem[]>();
    const noValueLabel =
      swimlane === "assignee" ? "Unassigned" :
      swimlane === "parent" ? "No parent" :
      "Unknown";

    for (const item of filteredItems) {
      let key: string;
      if (swimlane === "assignee") {
        key = item.assignee ?? noValueLabel;
      } else if (swimlane === "parent") {
        key = item.parentId ? (parentMap.get(item.parentId) ?? `#${item.parentId}`) : noValueLabel;
      } else {
        // type
        key = item.type.charAt(0).toUpperCase() + item.type.slice(1);
      }

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }

    // Sort: named groups first alphabetically, "no value" group last
    const entries = Array.from(groups.entries());
    entries.sort(([a], [b]) => {
      if (a === noValueLabel) return 1;
      if (b === noValueLabel) return -1;
      return a.localeCompare(b);
    });

    return entries;
  }, [filteredItems, swimlane, parentMap]);

  /** Render columns for a given set of items */
  function renderColumns(columnItems: WorkItem[]) {
    const cols = workflowStates.map((ws) => ({
      state: ws.slug,
      label: ws.displayName,
      color: CATEGORY_COLORS[ws.category] ?? "text-gray-600 bg-gray-50 border-gray-200",
      items: columnItems.filter((i) => i.state === ws.slug),
    }));

    return (
      <div className="flex gap-4">
        {cols.map((col) => (
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
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverState(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(col.state);
            }}
          >
            {/* Only show column headers when not in swimlane mode (swimlane mode shows them once at top) */}
            {!swimlaneGroups && (
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
            )}
            <div className="flex-1 space-y-2.5 px-0.5">
              {col.items.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggingId(item.id);
                    e.dataTransfer.effectAllowed = "move";
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
                    changedIds.has(item.id) && "realtime-highlight",
                    getCardRuleClass(item, workflowStates)
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
    );
  }

  // Flat columns for non-swimlane mode
  const flatColumns = workflowStates.map((ws) => ({
    state: ws.slug,
    label: ws.displayName,
    color: CATEGORY_COLORS[ws.category] ?? "text-gray-600 bg-gray-50 border-gray-200",
    items: filteredItems.filter((i) => i.state === ws.slug),
  }));

  return (
    <>
      <Header
        title={projectName}
        subtitle={activeSprint ? activeSprint.name : "Board"}
        actions={
          <div className="flex items-center gap-2">
            {/* TRK-137: Type filter toggle */}
            <button
              onClick={() => setHideContainers((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors",
                hideContainers
                  ? "bg-accent/10 text-accent border-accent/30"
                  : "bg-surface text-text-secondary border-border hover:border-border-hover"
              )}
            >
              <Filter className="w-3 h-3" />
              Stories & tasks only
            </button>

            {/* TRK-135: Swimlane dropdown */}
            <div className="relative">
              <button
                onClick={() => setSwimlaneDropdownOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors",
                  swimlane !== "none"
                    ? "bg-accent/10 text-accent border-accent/30"
                    : "bg-surface text-text-secondary border-border hover:border-border-hover"
                )}
              >
                <Rows3 className="w-3 h-3" />
                Swimlanes
                {swimlane !== "none" && (
                  <span className="text-[10px] opacity-70">
                    ({SWIMLANE_OPTIONS.find((o) => o.value === swimlane)?.label})
                  </span>
                )}
              </button>
              {swimlaneDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setSwimlaneDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
                    {SWIMLANE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateSwimlane(opt.value)}
                        className={cn(
                          "w-full text-left px-3 py-1.5 text-xs hover:bg-accent/5 transition-colors",
                          swimlane === opt.value
                            ? "text-accent font-medium"
                            : "text-text-secondary"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <CreateButton
              onClick={() => setCreateOpen(true)}
              label="New Item"
            />
          </div>
        }
      />
      <div className="flex-1 overflow-auto p-6">
        {swimlaneGroups ? (
          /* TRK-135: Swimlane layout */
          <div className="space-y-1">
            {/* Sticky column headers */}
            <div className="flex gap-4 mb-3">
              {workflowStates.map((ws) => {
                const colItems = filteredItems.filter((i) => i.state === ws.slug);
                return (
                  <div key={ws.slug} className="flex-1 min-w-[200px] px-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
                          CATEGORY_COLORS[ws.category] ?? "text-gray-600 bg-gray-50 border-gray-200"
                        )}
                      >
                        {ws.displayName}
                      </span>
                      <span className="text-xs text-text-tertiary">
                        {colItems.length}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {swimlaneGroups.map(([laneKey, laneItems]) => {
              const isCollapsed = collapsedLanes.has(laneKey);
              return (
                <div key={laneKey} className="border border-border/50 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleLane(laneKey)}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-surface-secondary/50 hover:bg-surface-secondary transition-colors text-left"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />
                    )}
                    <span className="text-xs font-medium text-text-primary">
                      {laneKey}
                    </span>
                    <span className="text-[10px] text-text-tertiary">
                      {laneItems.length} item{laneItems.length !== 1 ? "s" : ""}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div className="p-3">
                      {renderColumns(laneItems)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Standard flat board */
          <div className="flex gap-4 h-full">
            {flatColumns.map((col) => (
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
                        changedIds.has(item.id) && "realtime-highlight",
                        getCardRuleClass(item, workflowStates)
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
        )}
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
