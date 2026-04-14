"use client";

import { useState, useRef, useEffect } from "react";
import { useVariant } from "@/components/VariantContext";
import { useStateOverride } from "@/components/StateOverrideContext";
import { MockDetailPanel } from "@/components/MockDetailPanel";
import { Bug, CheckSquare, Square, GitPullRequest, CheckCircle2, Circle, XCircle, GitBranch, ChevronDown, ChevronRight, Plus, Settings2, GripVertical, Trash2, ToggleLeft, ToggleRight, Pencil } from "lucide-react";
import { PointsBadge } from "@/components/PointsBadge";

const fullStates = [
  { key: "new", label: "New", color: "text-gray-600 bg-gray-50 border-gray-200" },
  { key: "active", label: "Active", color: "text-blue-600 bg-blue-50 border-blue-200" },
  { key: "ready", label: "Ready", color: "text-amber-600 bg-amber-50 border-amber-200" },
  { key: "in_progress", label: "In Progress", color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { key: "done", label: "Done", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
];

const simpleStates = [
  { key: "new", label: "To Do", color: "text-gray-600 bg-gray-50 border-gray-200" },
  { key: "in_progress", label: "Doing", color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
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
  points?: number | null;
  tasks?: Task[];
  pr?: { number: number; title: string; status: "open" | "merged" | "closed"; ci: "passing" | "failing" | "pending" | null };
  branch?: string;
}

const mockCards: Card[] = [
  { id: 7, title: "Add and View Comments", type: "story", state: "new", assignee: "Hannes", parentTitle: null, points: 3, tasks: [] },
  { id: 8, title: "Board cards misaligned on Safari", type: "bug", state: "active", assignee: "Hannes", parentTitle: "Work Item Management", points: 2, pr: { number: 52, title: "Fix Safari card alignment", status: "open", ci: "passing" }, branch: "fix/TRK-8-safari-cards" },
  { id: 6, title: "Create and Manage Sprints", type: "story", state: "ready", assignee: "Hannes", parentTitle: null, points: 8, tasks: [
    { id: 11, title: "Update API docs", done: false },
  ]},
  { id: 4, title: "View Work Item Detail", type: "story", state: "in_progress", assignee: "Hannes", parentTitle: null, points: 13, pr: { number: 47, title: "feat: detail panel with markdown preview", status: "open", ci: "failing" }, branch: "feat/TRK-4-detail-panel", tasks: [
    { id: 14, title: "Add markdown preview", done: true },
    { id: 15, title: "Wire up inline editing", done: false },
    { id: 16, title: "Connect attachment gallery", done: false },
  ]},
  { id: 5, title: "Plan Sprint", type: "story", state: "in_progress", assignee: "Hannes", parentTitle: null, points: 5, branch: "feat/TRK-5-sprint-planning", tasks: [
    { id: 10, title: "Write unit tests for drag-and-drop", done: false },
    { id: 17, title: "Add capacity bar to sprint header", done: true },
  ]},
  { id: 9, title: "Sprint dates off by one day", type: "bug", state: "in_progress", assignee: "Hannes", parentTitle: "Sprint Planning", points: 1 },
  { id: 12, title: "Review PR #47", type: "task", state: "new", assignee: "Hannes", parentTitle: null },
  { id: 13, title: "Set up staging environment", type: "task", state: "done", assignee: "Hannes", parentTitle: null },
  { id: 1, title: "Create Work Item", type: "story", state: "done", assignee: "Hannes", parentTitle: null, points: 3, pr: { number: 38, title: "feat: work item CRUD", status: "merged", ci: "passing" }, tasks: [] },
  { id: 2, title: "View Sprint Board", type: "story", state: "done", assignee: "Hannes", parentTitle: null, points: 5, tasks: [] },
  { id: 3, title: "View Backlog Table", type: "story", state: "done", assignee: "Hannes", parentTitle: null, points: 3, tasks: [] },
];

const typeDot: Record<string, string> = { story: "bg-emerald-500", bug: "bg-red-500", task: "bg-slate-400" };
const typeLabel: Record<string, string> = { story: "Story", bug: "Bug", task: "Task" };

/* ── Swimlane definitions ───────────────────────────────────── */

type SwimlaneDef = {
  id: string;
  label: string;
  traql: string;
  groupFn: (card: Card) => string;
};

const swimlaneOptions: SwimlaneDef[] = [
  { id: "none", label: "None", traql: "", groupFn: () => "" },
  {
    id: "assignee",
    label: "By assignee",
    traql: "GROUP BY assignee",
    groupFn: (c) => c.assignee ?? "Unassigned",
  },
  {
    id: "parent",
    label: "By parent",
    traql: "GROUP BY parent",
    groupFn: (c) => c.parentTitle ?? "No parent",
  },
  {
    id: "ci",
    label: "By CI status",
    traql: "GROUP BY ci:status",
    groupFn: (c) => {
      if (!c.pr) return "No PR";
      if (c.pr.ci === "passing") return "ci:passing";
      if (c.pr.ci === "failing") return "ci:failing";
      return "ci:pending";
    },
  },
];

/* ── Card rule definitions ──────────────────────────────────── */

interface CardRule {
  id: string;
  traql: string;
  label: string;
  style: string; // tailwind classes applied to the card wrapper
  matchFn: (card: Card) => boolean;
  _disabled?: boolean;
}

const defaultCardRules: CardRule[] = [
  {
    id: "ci-failing",
    traql: "ci:failing",
    label: "CI failing",
    style: "border-l-[3px] border-l-red-500",
    matchFn: (c) => c.pr?.ci === "failing",
  },
  {
    id: "pr-open",
    traql: "pr:open",
    label: "PR open",
    style: "border-l-[3px] border-l-blue-500",
    matchFn: (c) => c.pr?.status === "open",
  },
  {
    id: "big-story",
    traql: "points > 8",
    label: "Large story",
    style: "bg-amber-50/60",
    matchFn: (c) => (c.points ?? 0) > 8,
  },
  {
    id: "pr-merged",
    traql: "has:pr AND pr:merged",
    label: "PR merged",
    style: "border-l-[3px] border-l-emerald-500",
    matchFn: (c) => c.pr?.status === "merged",
  },
];

/* ── Helpers ─────────────────────────────────────────────────── */

function getCardRuleStyle(card: Card, rules: CardRule[], enabled: boolean): string {
  if (!enabled) return "";
  for (const rule of rules) {
    if (!rule._disabled && rule.matchFn(card)) return rule.style;
  }
  return "";
}

const ruleSwatchColor: Record<string, string> = {
  "ci-failing": "bg-red-500",
  "pr-open": "bg-blue-500",
  "big-story": "bg-amber-400",
  "pr-merged": "bg-emerald-500",
};

/* ── Rule color options ─────────────────────────────────────── */

const ruleColorOptions = [
  { value: "bg-red-500", label: "Red" },
  { value: "bg-blue-500", label: "Blue" },
  { value: "bg-amber-400", label: "Amber" },
  { value: "bg-emerald-500", label: "Green" },
  { value: "bg-violet-500", label: "Violet" },
  { value: "bg-orange-500", label: "Orange" },
  { value: "bg-pink-500", label: "Pink" },
  { value: "bg-cyan-500", label: "Cyan" },
];

/* ── Component ──────────────────────────────────────────────── */

export default function BoardPage() {
  const variant = useVariant();
  const boardState = useStateOverride("board");
  const isSimple = !variant.features.sprintCapacity && !variant.features.advancedPlanning && !variant.features.timelinePlanning;
  const states = isSimple ? simpleStates : fullStates;
  const [selected, setSelected] = useState<Card | null>(null);
  const [taskStates, setTaskStates] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = { 13: true };
    mockCards.forEach(c => c.tasks?.forEach(t => { init[t.id] = t.done; }));
    return init;
  });

  // Swimlane state
  const [activeSwimlane, setActiveSwimlane] = useState("none");
  const [customSwimlaneExpr, setCustomSwimlaneExpr] = useState("");
  const [showCustomSwimlane, setShowCustomSwimlane] = useState(false);
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set());

  // Card rules state
  const [cardRulesEnabled, setCardRulesEnabled] = useState(true);
  const [cardRules, setCardRules] = useState<CardRule[]>([...defaultCardRules]);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Board settings panel
  const [customizePanelOpen, setCustomizePanelOpen] = useState(false);
  const customizeBtnRef = useRef<HTMLButtonElement>(null);
  const customizePanelRef = useRef<HTMLDivElement>(null);

  // New rule form
  const [newRuleLabel, setNewRuleLabel] = useState("");
  const [newRuleTraql, setNewRuleTraql] = useState("");
  const [newRuleColor, setNewRuleColor] = useState("bg-blue-500");

  // Close panel on outside click
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

  function toggleTask(taskId: number) {
    setTaskStates(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  }

  function toggleLane(laneKey: string) {
    setCollapsedLanes(prev => {
      const next = new Set(prev);
      if (next.has(laneKey)) next.delete(laneKey);
      else next.add(laneKey);
      return next;
    });
  }

  function toggleRuleEnabled(ruleId: string) {
    setCardRules(prev => prev.map(r => r.id === ruleId ? { ...r, _disabled: !r._disabled } : r));
  }

  function deleteRule(ruleId: string) {
    setCardRules(prev => prev.filter(r => r.id !== ruleId));
  }

  function addRule() {
    if (!newRuleLabel.trim() || !newRuleTraql.trim()) return;
    const newRule: CardRule = {
      id: `custom-${Date.now()}`,
      traql: newRuleTraql,
      label: newRuleLabel,
      style: `border-l-[3px] border-l-blue-500`,
      matchFn: () => false, // click dummy - no real matching
    };
    setCardRules(prev => [...prev, newRule]);
    setNewRuleLabel("");
    setNewRuleTraql("");
    setNewRuleColor("bg-blue-500");
  }

  // Resolve effective state for cards (tasks move to done when checked)
  // In simple mode, map non-simple states to the 3-column model
  function effectiveState(card: Card): string {
    if (card.type === "task" && taskStates[card.id]) return "done";
    const raw = card.state;
    if (isSimple) {
      if (raw === "done") return "done";
      if (raw === "in_progress") return "in_progress";
      return "new"; // new, active, ready all map to "To Do"
    }
    return raw;
  }

  // Get swimlane config
  const swimlaneDef = swimlaneOptions.find(s => s.id === activeSwimlane) ?? swimlaneOptions[0];
  const isSwimlaneActive = activeSwimlane !== "none";

  const hasCustomizeFeatures = variant.features.swimlanes || variant.features.cardRules;

  // Group cards into swimlanes
  function getSwimlaneGroups(): { key: string; label: string; cards: Card[] }[] {
    if (!isSwimlaneActive) return [{ key: "__all", label: "", cards: mockCards }];
    const groups = new Map<string, Card[]>();
    for (const card of mockCards) {
      const key = swimlaneDef.groupFn(card);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(card);
    }
    // Sort groups alphabetically, but put "Unassigned"/"No parent"/"No PR" last
    const entries = Array.from(groups.entries()).sort((a, b) => {
      const aFallback = a[0].startsWith("No ") || a[0] === "Unassigned" ? 1 : 0;
      const bFallback = b[0].startsWith("No ") || b[0] === "Unassigned" ? 1 : 0;
      if (aFallback !== bFallback) return aFallback - bFallback;
      return a[0].localeCompare(b[0]);
    });
    return entries.map(([key, cards]) => ({ key, label: key, cards }));
  }

  /* ── Render a single card ─────────────────────────────────── */

  function renderCard(item: Card) {
    const ruleStyle = getCardRuleStyle(item, cardRules, variant.features.cardRules && cardRulesEnabled);

    return (
      <div key={item.id}
        onClick={() => setSelected(item)}
        className={`bg-surface border rounded-lg p-3 hover:border-border-hover transition-colors cursor-pointer ${
          item.type === "bug" && !ruleStyle ? "border-red-200" : !ruleStyle ? "border-border" : "border-border"
        } ${ruleStyle}`}>
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
          <span className="text-xs text-text-tertiary ml-auto">TRK-{item.id}</span>
          {variant.features.storyPoints && item.points != null && (
            <PointsBadge points={item.points} />
          )}
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

        {/* GitHub integration */}
        {variant.features.githubLinks && (item.pr || item.branch) && (
          <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-2 flex-wrap">
            {item.pr && (
              <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md ${
                item.pr.status === "merged" ? "bg-purple-50 text-purple-700" :
                item.pr.status === "closed" ? "bg-red-50 text-red-600" :
                "bg-blue-50 text-blue-700"
              }`}>
                <GitPullRequest className="w-3 h-3" />
                #{item.pr.number}
              </span>
            )}
            {variant.features.githubCIStatus && item.pr?.ci && (
              <span className={`inline-flex items-center gap-0.5 text-[11px] ${
                item.pr.ci === "passing" ? "text-emerald-600" :
                item.pr.ci === "failing" ? "text-red-500" :
                "text-amber-500"
              }`}>
                {item.pr.ci === "passing" ? <CheckCircle2 className="w-3 h-3" /> :
                 item.pr.ci === "failing" ? <XCircle className="w-3 h-3" /> :
                 <Circle className="w-3 h-3" />}
                CI
              </span>
            )}
            {item.branch && (
              <span className="inline-flex items-center gap-1 text-[11px] text-text-tertiary">
                <GitBranch className="w-3 h-3" />
                {item.branch.length > 25 ? item.branch.slice(0, 25) + "..." : item.branch}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ── Render columns for a set of cards ────────────────────── */

  function renderColumns(cards: Card[]) {
    return (
      <div className="flex gap-4">
        {states.map((col) => {
          const items = cards.filter(c => {
            const es = effectiveState(c);
            if (c.type === "task" && !taskStates[c.id] && c.state === "done") return col.key === "done";
            return es === col.key;
          });
          return (
            <div key={col.key} className="flex-1 min-w-[180px] flex flex-col">
              {!isSwimlaneActive && (
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${col.color}`}>
                    {col.label}
                  </span>
                  <span className="text-xs text-text-tertiary">{items.length}</span>
                </div>
              )}
              <div className="flex-1 space-y-2.5">
                {items.map(renderCard)}
                {items.length === 0 && (
                  <div className="border border-dashed border-border rounded-lg p-4 text-center text-xs text-text-tertiary">No items</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  /* ── Main render ──────────────────────────────────────────── */

  const lanes = getSwimlaneGroups();

  return (
    <>
      <header className="h-14 px-6 flex items-center justify-between border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-text-primary">{isSimple ? "My Project" : "Trakr"}</h1>
          {!isSimple && (
            <>
              <span className="text-text-tertiary">/</span>
              <span className="text-sm text-text-secondary">Board</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Customize board button */}
          {hasCustomizeFeatures && (
            <div className="relative">
              <button
                ref={customizeBtnRef}
                onClick={() => setCustomizePanelOpen(!customizePanelOpen)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  customizePanelOpen || isSwimlaneActive || cardRulesEnabled
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                    : "bg-surface text-text-secondary border-border hover:bg-surface-hover"
                }`}
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
                  {variant.features.swimlanes && (
                    <div className="p-4">
                      <div className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold mb-2.5">Swimlanes</div>

                      {/* Swimlane grouping selector */}
                      <div className="space-y-1">
                        {swimlaneOptions.map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => { setActiveSwimlane(opt.id); setCollapsedLanes(new Set()); setShowCustomSwimlane(false); }}
                            className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors ${
                              activeSwimlane === opt.id && !showCustomSwimlane
                                ? "bg-indigo-50 text-indigo-700 font-medium"
                                : "text-text-primary hover:bg-surface-hover"
                            }`}
                          >
                            <div className="font-medium">{opt.label}</div>
                            {opt.traql && (
                              <code className="text-[10px] font-mono text-text-tertiary mt-0.5 block">{opt.traql}</code>
                            )}
                          </button>
                        ))}

                        {/* Custom expression option */}
                        <button
                          onClick={() => setShowCustomSwimlane(!showCustomSwimlane)}
                          className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors ${
                            showCustomSwimlane
                              ? "bg-indigo-50 text-indigo-700 font-medium"
                              : "text-text-primary hover:bg-surface-hover"
                          }`}
                        >
                          <div className="font-medium">Custom...</div>
                        </button>

                        {showCustomSwimlane && (
                          <div className="px-3 pt-1 pb-1">
                            <input
                              type="text"
                              value={customSwimlaneExpr}
                              onChange={e => setCustomSwimlaneExpr(e.target.value)}
                              placeholder="GROUP BY field_name"
                              className="w-full text-xs font-mono px-2.5 py-1.5 border border-border rounded-md bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Divider */}
                  {variant.features.swimlanes && variant.features.cardRules && (
                    <div className="border-t border-border" />
                  )}

                  {/* ── Card rules section ─────────────────────── */}
                  {variant.features.cardRules && (
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold">Card rules</div>
                        <button
                          onClick={() => setCardRulesEnabled(!cardRulesEnabled)}
                          className="text-text-tertiary hover:text-text-primary transition-colors"
                          title={cardRulesEnabled ? "Disable all rules" : "Enable all rules"}
                        >
                          {cardRulesEnabled ? (
                            <ToggleRight className="w-5 h-5 text-indigo-600" />
                          ) : (
                            <ToggleLeft className="w-5 h-5" />
                          )}
                        </button>
                      </div>

                      {/* Rule list */}
                      <div className="space-y-0.5 mb-3">
                        {cardRules.map((rule) => (
                          <div
                            key={rule.id}
                            className={`group flex items-start gap-2 px-2.5 py-2 rounded-md hover:bg-surface-hover transition-colors ${
                              rule._disabled ? "opacity-50" : ""
                            }`}
                          >
                            {/* Drag handle */}
                            <GripVertical className="w-3.5 h-3.5 text-text-tertiary/40 mt-0.5 shrink-0 cursor-grab" />

                            {/* Color swatch */}
                            <span className={`w-3 h-3 rounded-sm mt-0.5 shrink-0 ${ruleSwatchColor[rule.id] ?? "bg-blue-500"}`} />

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
                              <button
                                onClick={() => toggleRuleEnabled(rule.id)}
                                className="text-text-tertiary hover:text-text-primary p-0.5"
                                title={rule._disabled ? "Enable" : "Disable"}
                              >
                                {rule._disabled ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5 text-indigo-600" />}
                              </button>
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
                            {ruleColorOptions.slice(0, 4).map(c => (
                              <button
                                key={c.value}
                                onClick={() => setNewRuleColor(c.value)}
                                className={`w-4 h-4 rounded-sm ${c.value} ${newRuleColor === c.value ? "ring-2 ring-offset-1 ring-indigo-400" : ""}`}
                                title={c.label}
                              />
                            ))}
                          </div>
                          <input
                            type="text"
                            value={newRuleLabel}
                            onChange={e => setNewRuleLabel(e.target.value)}
                            placeholder="Label"
                            className="flex-1 text-xs px-2 py-1.5 border border-border rounded-md bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newRuleTraql}
                            onChange={e => setNewRuleTraql(e.target.value)}
                            placeholder="TraQL expression, e.g. ci:failing"
                            className="flex-1 text-xs font-mono px-2 py-1.5 border border-border rounded-md bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300"
                            onKeyDown={e => { if (e.key === "Enter") addRule(); }}
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
                  )}
                </div>
              )}
            </div>
          )}

          {/* Create work item button */}
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto relative">

        <div className="p-6">
          {boardState === "empty" ? (
            <div className="text-center py-20 text-sm text-text-tertiary">{isSimple ? "No items on the board." : "No items in this sprint."}</div>
          ) : boardState === "loading" ? (
            <div className="text-center py-20 text-sm text-text-tertiary">Loading board...</div>
          ) : isSwimlaneActive ? (
            /* ── Swimlane view ─────────────────────────────────── */
            <div className="space-y-0">
              {/* Column headers (sticky) */}
              <div className="flex gap-4 mb-4">
                <div className="w-40 shrink-0" /> {/* lane label spacer */}
                {states.map(col => (
                  <div key={col.key} className="flex-1 min-w-[180px]">
                    <div className="flex items-center gap-2 px-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${col.color}`}>
                        {col.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Swimlane rows */}
              {lanes.map(lane => {
                const isCollapsed = collapsedLanes.has(lane.key);
                const itemCount = lane.cards.length;
                return (
                  <div key={lane.key} className="border-t border-border/60">
                    {/* Lane header */}
                    <button
                      onClick={() => toggleLane(lane.key)}
                      className="flex items-center gap-2 w-full py-2 px-1 hover:bg-surface-hover/50 transition-colors text-left"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-text-primary">{lane.label}</span>
                      <span className="text-[10px] text-text-tertiary bg-gray-100 px-1.5 py-0.5 rounded-full">{itemCount}</span>
                    </button>

                    {/* Lane content */}
                    {!isCollapsed && (
                      <div className="flex gap-4 pb-4 pt-1">
                        <div className="w-40 shrink-0" /> {/* lane label spacer */}
                        {states.map(col => {
                          const items = lane.cards.filter(c => effectiveState(c) === col.key);
                          return (
                            <div key={col.key} className="flex-1 min-w-[180px]">
                              <div className="space-y-2.5">
                                {items.map(renderCard)}
                                {items.length === 0 && (
                                  <div className="border border-dashed border-border rounded-lg p-3 text-center text-[10px] text-text-tertiary">—</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Default flat board ────────────────────────────── */
            renderColumns(mockCards)
          )}
        </div>
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
