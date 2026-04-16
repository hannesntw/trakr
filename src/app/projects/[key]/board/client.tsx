"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header, CreateButton } from "@/components/Header";
import { BoardCard, type GitHubStatus, type ChildTask } from "@/components/BoardCard";
import { DetailPanel } from "@/components/DetailPanel";
import { CreateWorkItemDialog } from "@/components/CreateWorkItemDialog";
import type { WorkflowState } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import {
  ChevronDown,
  ChevronRight,
  Filter,
  Settings2,
  GripVertical,
  Trash2,
  Pencil,
} from "lucide-react";
import { Toggle } from "@/components/Toggle";

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
  state: string;
}

interface BoardClientProps {
  projectId: string;
  projectKey: string;
  projectName: string;
  makerMode?: boolean;
}

// --- Card rule types (configurable, CRUD, localStorage-persisted) ---
type CardRuleDef = {
  id: string;
  label: string;
  traql: string;       // stored expression string
  color: string;        // tailwind bg class for swatch, e.g. "bg-red-500"
  enabled: boolean;
};

const RULE_COLOR_OPTIONS = [
  { value: "bg-red-500", label: "Red" },
  { value: "bg-blue-500", label: "Blue" },
  { value: "bg-amber-400", label: "Amber" },
  { value: "bg-emerald-500", label: "Green" },
  { value: "bg-violet-500", label: "Violet" },
  { value: "bg-orange-500", label: "Orange" },
  { value: "bg-pink-500", label: "Pink" },
  { value: "bg-cyan-500", label: "Cyan" },
];

/** Map a color swatch class to an inline style for borderLeftColor */
const COLOR_TO_HEX: Record<string, string> = {
  "bg-red-500": "#ef4444",
  "bg-blue-500": "#3b82f6",
  "bg-amber-400": "#fbbf24",
  "bg-emerald-500": "#10b981",
  "bg-violet-500": "#8b5cf6",
  "bg-orange-500": "#f97316",
  "bg-pink-500": "#ec4899",
  "bg-cyan-500": "#06b6d4",
};

function ruleStyleFromColor(color: string): React.CSSProperties {
  const hex = COLOR_TO_HEX[color] ?? "#3b82f6";
  return { borderLeftWidth: "3px", borderLeftColor: hex, borderLeftStyle: "solid" };
}

/** Simple expression matcher — supports: type:X, points >= N, points > N, has:assignee, priority >= N */
function matchRule(expr: string, item: WorkItem, _wfStates: WorkflowState[]): boolean {
  const e = expr.trim().toLowerCase();
  if (!e) return false;

  // type:bug, type:story, type:task, type:epic, type:feature
  const typeMatch = e.match(/^type\s*:\s*(\w+)$/);
  if (typeMatch) return item.type === typeMatch[1];

  // points > N or points >= N
  const pointsGt = e.match(/^points\s*>\s*(\d+)$/);
  if (pointsGt) return item.points != null && item.points > parseInt(pointsGt[1]);
  const pointsGte = e.match(/^points\s*>=\s*(\d+)$/);
  if (pointsGte) return item.points != null && item.points >= parseInt(pointsGte[1]);

  // priority >= N or priority > N
  const prioGte = e.match(/^priority\s*>=\s*(\d+)$/);
  if (prioGte) return item.priority != null && item.priority >= parseInt(prioGte[1]);
  const prioGt = e.match(/^priority\s*>\s*(\d+)$/);
  if (prioGt) return item.priority != null && item.priority > parseInt(prioGt[1]);

  // has:assignee
  if (e === "has:assignee") return item.assignee != null && item.assignee !== "";
  // no:assignee
  if (e === "no:assignee") return item.assignee == null || item.assignee === "";

  // assignee:Name (case insensitive contains)
  const assigneeMatch = e.match(/^assignee\s*:\s*(.+)$/);
  if (assigneeMatch) return (item.assignee ?? "").toLowerCase().includes(assigneeMatch[1].trim());

  return false;
}

const DEFAULT_CARD_RULES: CardRuleDef[] = [
  { id: "bug", label: "Bug", traql: "type:bug", color: "bg-red-500", enabled: true },
  { id: "high-effort", label: "High effort (8+)", traql: "points >= 8", color: "bg-amber-400", enabled: true },
];

const CARD_RULES_STORAGE_KEY = "stori-board-card-rules";
const CARD_RULES_ENABLED_KEY = "stori-board-card-rules-enabled";

function loadCardRules(): CardRuleDef[] {
  if (typeof window === "undefined") return DEFAULT_CARD_RULES;
  try {
    const raw = localStorage.getItem(CARD_RULES_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return DEFAULT_CARD_RULES;
}

function loadCardRulesEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(CARD_RULES_ENABLED_KEY);
    if (raw !== null) return JSON.parse(raw);
  } catch { /* ignore */ }
  return true;
}

// --- Swimlane types ---
type SwimlaneSetting = "none" | "assignee" | "parent" | "type" | "custom";

const SWIMLANE_OPTIONS: { value: SwimlaneSetting; label: string; description: string }[] = [
  { value: "none", label: "None", description: "" },
  { value: "assignee", label: "By assignee", description: "GROUP BY assignee" },
  { value: "parent", label: "By parent", description: "GROUP BY parent" },
  { value: "type", label: "By type", description: "GROUP BY type" },
];

export function BoardClient({
  projectId,
  projectKey,
  projectName,
  makerMode,
}: BoardClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [items, setItems] = useState<WorkItem[]>([]);
  const [parentMap, setParentMap] = useState<Map<string, string>>(new Map());
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [workflowStates, setWorkflowStates] = useState<WorkflowState[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [dragOverState, setDragOverState] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [githubStatusMap, setGithubStatusMap] = useState<Record<string, GitHubStatus>>({});

  // TRK-137: Type filter — hide epics/features by default
  const [hideContainers, setHideContainers] = useState(true);

  // TRK-135: Swimlane state from URL
  const swimlaneParam = (searchParams.get("swimlane") ?? "none") as SwimlaneSetting;
  const [swimlane, setSwimlane] = useState<SwimlaneSetting>(swimlaneParam);
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set());
  const [customSwimlaneExpr, setCustomSwimlaneExpr] = useState("");
  const [showCustomSwimlane, setShowCustomSwimlane] = useState(false);

  // Customize panel
  const [customizePanelOpen, setCustomizePanelOpen] = useState(false);
  const customizeBtnRef = useRef<HTMLButtonElement>(null);
  const customizePanelRef = useRef<HTMLDivElement>(null);

  // Card rules state (localStorage-persisted)
  const [cardRules, setCardRules] = useState<CardRuleDef[]>(DEFAULT_CARD_RULES);
  const [cardRulesEnabled, setCardRulesEnabled] = useState(true);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [dragRuleId, setDragRuleId] = useState<string | null>(null);
  const [dragOverRuleId, setDragOverRuleId] = useState<string | null>(null);

  // New rule form
  const [newRuleLabel, setNewRuleLabel] = useState("");
  const [newRuleTraql, setNewRuleTraql] = useState("");
  const [newRuleColor, setNewRuleColor] = useState("bg-blue-500");

  // Load card rules from localStorage on mount
  useEffect(() => {
    setCardRules(loadCardRules());
    setCardRulesEnabled(loadCardRulesEnabled());
  }, []);

  // Persist card rules to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(CARD_RULES_STORAGE_KEY, JSON.stringify(cardRules));
  }, [cardRules]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(CARD_RULES_ENABLED_KEY, JSON.stringify(cardRulesEnabled));
  }, [cardRulesEnabled]);

  // Close customize panel on outside click
  useEffect(() => {
    if (!customizePanelOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        customizePanelRef.current && !customizePanelRef.current.contains(e.target as Node) &&
        customizeBtnRef.current && !customizeBtnRef.current.contains(e.target as Node)
      ) {
        setCustomizePanelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [customizePanelOpen]);

  function updateSwimlane(value: SwimlaneSetting) {
    setSwimlane(value);
    setCollapsedLanes(new Set());
    setShowCustomSwimlane(false);
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

  // Card rule CRUD
  function toggleRuleEnabled(ruleId: string) {
    setCardRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
  }

  function deleteRule(ruleId: string) {
    setCardRules(prev => prev.filter(r => r.id !== ruleId));
  }

  function addRule() {
    if (!newRuleLabel.trim() || !newRuleTraql.trim()) return;
    const newRule: CardRuleDef = {
      id: `custom-${Date.now()}`,
      label: newRuleLabel.trim(),
      traql: newRuleTraql.trim(),
      color: newRuleColor,
      enabled: true,
    };
    setCardRules(prev => [...prev, newRule]);
    setNewRuleLabel("");
    setNewRuleTraql("");
    setNewRuleColor("bg-blue-500");
  }

  // Drag-and-drop reordering for rules
  function handleRuleDragStart(ruleId: string) {
    setDragRuleId(ruleId);
  }

  function handleRuleDragOver(e: React.DragEvent, ruleId: string) {
    e.preventDefault();
    if (dragRuleId && dragRuleId !== ruleId) {
      setDragOverRuleId(ruleId);
    }
  }

  function handleRuleDrop(targetRuleId: string) {
    if (!dragRuleId || dragRuleId === targetRuleId) {
      setDragRuleId(null);
      setDragOverRuleId(null);
      return;
    }
    setCardRules(prev => {
      const fromIdx = prev.findIndex(r => r.id === dragRuleId);
      const toIdx = prev.findIndex(r => r.id === targetRuleId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setDragRuleId(null);
    setDragOverRuleId(null);
  }

  /** Get the card rule style class for an item (first matching enabled rule wins) */
  function getCardRuleStyle(item: WorkItem): React.CSSProperties | undefined {
    if (!cardRulesEnabled) return undefined;
    for (const rule of cardRules) {
      if (!rule.enabled) continue;
      if (matchRule(rule.traql, item, workflowStates)) {
        return ruleStyleFromColor(rule.color);
      }
    }
    return undefined;
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

    // In maker mode, show all items (no sprint filtering)
    const boardItems = makerMode
      ? allItems
      : sprint
        ? allItems.filter((i) => i.sprintId === sprint.id)
        : allItems;
    setItems(boardItems);
  }, [projectId, makerMode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleCreate = () => setCreateOpen(true);
    const handleClose = () => {
      setCreateOpen(false);
      setSelectedId(null);
      setCustomizePanelOpen(false);
    };
    window.addEventListener("stori:create-item", handleCreate);
    window.addEventListener("stori:close-panel", handleClose);
    return () => {
      window.removeEventListener("stori:create-item", handleCreate);
      window.removeEventListener("stori:close-panel", handleClose);
    };
  }, []);

  const changedIds = useRealtimeRefresh(fetchData);

  // TRK-137: Filtered items (hide epics/features when toggle is on)
  const filteredItems = useMemo(() => {
    if (!hideContainers) return items;
    return items.filter((i) => i.type !== "epic" && i.type !== "feature");
  }, [items, hideContainers]);

  // Build child tasks map for task checklists on story/feature cards
  const childTasksMap = useMemo(() => {
    const map = new Map<string, ChildTask[]>();
    for (const item of items) {
      if (item.type === "task" && item.parentId) {
        const existing = map.get(item.parentId) ?? [];
        existing.push({
          id: item.id,
          displayId: item.displayId,
          title: item.title,
          state: item.state,
        });
        map.set(item.parentId, existing);
      }
    }
    return map;
  }, [items]);

  // Toggle task done/undone
  async function handleToggleTask(taskId: string, done: boolean) {
    const doneState = workflowStates.find((s) => s.category === "done")?.slug ?? "done";
    const todoState = workflowStates.find((s) => s.category === "todo")?.slug ?? "new";
    const newState = done ? doneState : todoState;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === taskId ? { ...i, state: newState } : i))
    );

    await fetch(`/api/work-items/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: newState }),
    });

    fetchData();
  }

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
    todo: "text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-500/15 dark:border-gray-500/25",
    in_progress: "text-indigo-600 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-500/15 dark:border-indigo-500/25",
    done: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/15 dark:border-emerald-500/25",
  };

  // TRK-135: Compute swimlane groups
  const swimlaneGroups = useMemo(() => {
    if (swimlane === "none") return null;

    // Parse custom field from expression like "GROUP BY points" or just "points"
    const customField = swimlane === "custom"
      ? customSwimlaneExpr.trim().replace(/^GROUP\s+BY\s+/i, "").trim().toLowerCase()
      : null;

    const groups = new Map<string, WorkItem[]>();
    const noValueLabel =
      swimlane === "assignee" ? "Unassigned" :
      swimlane === "parent" ? "No parent" :
      swimlane === "custom" ? `No ${customField}` :
      "Unknown";

    for (const item of filteredItems) {
      let key: string;
      if (swimlane === "assignee") {
        key = item.assignee ?? noValueLabel;
      } else if (swimlane === "parent") {
        key = item.parentId ? (parentMap.get(item.parentId) ?? `#${item.parentId}`) : noValueLabel;
      } else if (swimlane === "type") {
        key = item.type.charAt(0).toUpperCase() + item.type.slice(1);
      } else if (swimlane === "custom" && customField) {
        const val = (item as unknown as Record<string, unknown>)[customField];
        key = val != null ? String(val) : noValueLabel;
        // Capitalize single-word values for display
        if (key !== noValueLabel && /^[a-z]/.test(key)) {
          key = key.charAt(0).toUpperCase() + key.slice(1);
        }
      } else {
        key = noValueLabel;
      }

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }

    // Sort: named groups first alphabetically, "no value" group last
    const entries = Array.from(groups.entries());
    entries.sort(([a], [b]) => {
      if (a === noValueLabel) return 1;
      if (b === noValueLabel) return -1;
      // Try numeric sort for fields like points/priority
      const numA = Number(a), numB = Number(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });

    return entries;
  }, [filteredItems, swimlane, parentMap, customSwimlaneExpr]);

  /** Render columns for a given set of items */
  function renderColumns(columnItems: WorkItem[]) {
    const cols = workflowStates.map((ws) => ({
      state: ws.slug,
      label: ws.displayName,
      color: CATEGORY_COLORS[ws.category] ?? "text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-500/15 dark:border-gray-500/25",
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
                    "cursor-grab active:cursor-grabbing rounded-lg",
                    draggingId === item.id && "opacity-50",
                    changedIds.has(item.id) && "realtime-highlight",
                  )}
                  style={getCardRuleStyle(item)}
                >
                  <BoardCard
                    id={item.id}
                    displayId={item.displayId}
                    title={item.title}
                    type={item.type as "epic" | "feature" | "story"}
                    state={item.state}
                    assignee={item.assignee}
                    projectKey={projectKey}
                    parentTitle={
                      item.parentId
                        ? parentMap.get(item.parentId)
                        : undefined
                    }
                    points={item.points}
                    github={githubStatusMap[item.id] ?? null}
                    childTasks={childTasksMap.get(item.id)}
                    onToggleTask={handleToggleTask}
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
    color: CATEGORY_COLORS[ws.category] ?? "text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-500/15 dark:border-gray-500/25",
    items: filteredItems.filter((i) => i.state === ws.slug),
  }));

  return (
    <>
      <Header
        title={projectName}
        subtitle={makerMode ? "Board" : (activeSprint ? activeSprint.name : "Board")}
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

            {/* Customize board button + popover */}
            <div className="relative">
              <button
                ref={customizeBtnRef}
                onClick={() => setCustomizePanelOpen(!customizePanelOpen)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors",
                  customizePanelOpen || swimlane !== "none" || cardRulesEnabled
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/25 dark:hover:bg-indigo-500/20"
                    : "bg-surface text-text-secondary border-border hover:border-border-hover"
                )}
              >
                <Settings2 className="w-3.5 h-3.5" />
                Customize
              </button>

              {/* Customize popover panel */}
              {customizePanelOpen && (
                <div
                  ref={customizePanelRef}
                  className="absolute right-0 top-full mt-1.5 z-40 w-[350px] bg-surface border border-border rounded-lg shadow-xl max-h-[calc(100vh-120px)] overflow-auto"
                >
                  {/* ── Swimlanes section ──────────────────────── */}
                  <div className="p-4">
                    <div className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold mb-2.5">Swimlanes</div>

                    <div className="space-y-1">
                      {SWIMLANE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => updateSwimlane(opt.value)}
                          className={cn(
                            "w-full text-left px-3 py-2 text-xs rounded-md transition-colors",
                            swimlane === opt.value && !showCustomSwimlane
                              ? "bg-indigo-50 text-indigo-700 font-medium"
                              : "text-text-primary hover:bg-surface-hover"
                          )}
                        >
                          <div className="font-medium">{opt.label}</div>
                          {opt.description && (
                            <code className="text-[10px] font-mono text-text-tertiary mt-0.5 block">{opt.description}</code>
                          )}
                        </button>
                      ))}

                      {/* Custom expression option */}
                      <button
                        onClick={() => setShowCustomSwimlane(!showCustomSwimlane)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs rounded-md transition-colors",
                          showCustomSwimlane
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400 font-medium"
                            : "text-text-primary hover:bg-content-bg"
                        )}
                      >
                        <div className="font-medium">Custom...</div>
                      </button>

                      {showCustomSwimlane && (
                        <div className="px-3 pt-1 pb-2 flex gap-1.5">
                          <input
                            type="text"
                            value={customSwimlaneExpr}
                            onChange={(e) => setCustomSwimlaneExpr(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && customSwimlaneExpr.trim()) { setSwimlane("custom"); } }}
                            placeholder="GROUP BY field_name"
                            className="flex-1 text-xs font-mono px-2.5 py-1.5 border border-border rounded-md bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300"
                          />
                          <button
                            onClick={() => { if (customSwimlaneExpr.trim()) setSwimlane("custom"); }}
                            disabled={!customSwimlaneExpr.trim()}
                            className="px-2.5 py-1.5 text-xs bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-md transition-colors"
                          >
                            Apply
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border" />

                  {/* ── Card rules section ─────────────────────── */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold">Card rules</div>
                      <Toggle enabled={cardRulesEnabled} onChange={(v) => setCardRulesEnabled(v)} size="sm" />
                    </div>

                    {/* Rule list */}
                    <div className="space-y-0.5 mb-3">
                      {cardRules.map((rule) => (
                        <div
                          key={rule.id}
                          draggable
                          onDragStart={() => handleRuleDragStart(rule.id)}
                          onDragOver={(e) => handleRuleDragOver(e, rule.id)}
                          onDrop={() => handleRuleDrop(rule.id)}
                          onDragEnd={() => { setDragRuleId(null); setDragOverRuleId(null); }}
                          className={cn(
                            "group flex items-start gap-2 px-2.5 py-2 rounded-md hover:bg-surface-hover transition-colors",
                            !rule.enabled && "opacity-50",
                            dragOverRuleId === rule.id && "ring-1 ring-indigo-300"
                          )}
                        >
                          {/* Drag handle */}
                          <GripVertical className="w-3.5 h-3.5 text-text-tertiary/40 mt-0.5 shrink-0 cursor-grab" />

                          {/* Color swatch */}
                          <span className={cn("w-3 h-3 rounded-sm mt-0.5 shrink-0", rule.color)} />

                          {/* Label + expression */}
                          <div className="flex-1 min-w-0">
                            {editingRuleId === rule.id ? (
                              <input
                                type="text"
                                defaultValue={rule.label}
                                autoFocus
                                onBlur={(e) => {
                                  setCardRules(prev => prev.map(r => r.id === rule.id ? { ...r, label: e.target.value || rule.label } : r));
                                  setEditingRuleId(null);
                                }}
                                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                className="text-xs font-medium text-text-primary bg-transparent border-b border-indigo-300 outline-none w-full"
                              />
                            ) : (
                              <span
                                className="text-xs font-medium text-text-primary cursor-text"
                                onClick={() => setEditingRuleId(rule.id)}
                                title="Click to edit"
                              >
                                {rule.label}
                              </span>
                            )}
                            <code className="text-[10px] font-mono text-indigo-600/70 block mt-0.5 truncate">{rule.traql}</code>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => setEditingRuleId(rule.id)}
                              className="text-text-tertiary hover:text-text-primary p-0.5"
                              title="Edit rule"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <Toggle enabled={rule.enabled} onChange={() => toggleRuleEnabled(rule.id)} size="sm" />
                            <button
                              onClick={() => deleteRule(rule.id)}
                              className="text-text-tertiary hover:text-red-500 p-0.5"
                              title="Delete rule"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {cardRules.length === 0 && (
                        <p className="text-xs text-text-tertiary px-2.5 py-2">No rules defined.</p>
                      )}
                    </div>

                    <div className="text-[10px] text-text-tertiary mb-2">First matching rule wins. Drag to reorder.</div>

                    {/* Add rule form */}
                    <div className="border-t border-border pt-3 space-y-2">
                      <div className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold">Add rule</div>
                      <div className="flex items-center gap-2">
                        {/* Color picker */}
                        <div className="flex gap-1 shrink-0">
                          {RULE_COLOR_OPTIONS.slice(0, 4).map((c) => (
                            <button
                              key={c.value}
                              onClick={() => setNewRuleColor(c.value)}
                              className={cn(
                                "w-4 h-4 rounded-sm",
                                c.value,
                                newRuleColor === c.value && "ring-2 ring-offset-1 ring-indigo-400"
                              )}
                              title={c.label}
                            />
                          ))}
                        </div>
                        <input
                          type="text"
                          value={newRuleLabel}
                          onChange={(e) => setNewRuleLabel(e.target.value)}
                          placeholder="Label"
                          className="flex-1 text-xs px-2 py-1.5 border border-border rounded-md bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newRuleTraql}
                          onChange={(e) => setNewRuleTraql(e.target.value)}
                          placeholder="TraQL expression, e.g. type:bug"
                          className="flex-1 text-xs font-mono px-2 py-1.5 border border-border rounded-md bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300"
                          onKeyDown={(e) => { if (e.key === "Enter") addRule(); }}
                        />
                        <button
                          onClick={addRule}
                          disabled={!newRuleLabel.trim() || !newRuleTraql.trim()}
                          className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
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
                          CATEGORY_COLORS[ws.category] ?? "text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-500/15 dark:border-gray-500/25"
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
                        "cursor-grab active:cursor-grabbing rounded-lg",
                        draggingId === item.id && "opacity-50",
                        changedIds.has(item.id) && "realtime-highlight",
                      )}
                      style={getCardRuleStyle(item)}
                    >
                      <BoardCard
                        id={item.id}
                        displayId={item.displayId}
                        title={item.title}
                        type={item.type as "epic" | "feature" | "story"}
                        state={item.state}
                        assignee={item.assignee}
                        projectKey={projectKey}
                        parentTitle={
                          item.parentId
                            ? parentMap.get(item.parentId)
                            : undefined
                        }
                        points={item.points}
                        github={githubStatusMap[item.id] ?? null}
                        childTasks={childTasksMap.get(item.id)}
                        onToggleTask={handleToggleTask}
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
