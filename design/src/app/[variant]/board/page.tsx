"use client";

import { useState } from "react";
import { useVariant } from "@/components/VariantContext";
import { useStateOverride } from "@/components/StateOverrideContext";
import { MockDetailPanel } from "@/components/MockDetailPanel";
import { Bug, CheckSquare, Square, GitPullRequest, CheckCircle2, Circle, XCircle, GitBranch, ChevronDown, ChevronRight, Palette, Layers, X } from "lucide-react";
import { PointsBadge } from "@/components/PointsBadge";

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
    if (rule.matchFn(card)) return rule.style;
  }
  return "";
}

const ruleSwatchColor: Record<string, string> = {
  "ci-failing": "bg-red-500",
  "pr-open": "bg-blue-500",
  "big-story": "bg-amber-400",
  "pr-merged": "bg-emerald-500",
};

/* ── Component ──────────────────────────────────────────────── */

export default function BoardPage() {
  const variant = useVariant();
  const boardState = useStateOverride("board");
  const [selected, setSelected] = useState<Card | null>(null);
  const [taskStates, setTaskStates] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = { 13: true };
    mockCards.forEach(c => c.tasks?.forEach(t => { init[t.id] = t.done; }));
    return init;
  });

  // Swimlane state
  const [activeSwimlane, setActiveSwimlane] = useState("none");
  const [swimlaneDropdownOpen, setSwimlaneDropdownOpen] = useState(false);
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set());

  // Card rules state
  const [cardRulesEnabled, setCardRulesEnabled] = useState(true);
  const [cardRulesPanelOpen, setCardRulesPanelOpen] = useState(false);

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

  // Resolve effective state for cards (tasks move to done when checked)
  function effectiveState(card: Card): string {
    if (card.type === "task" && taskStates[card.id]) return "done";
    return card.state;
  }

  // Get swimlane config
  const swimlaneDef = swimlaneOptions.find(s => s.id === activeSwimlane) ?? swimlaneOptions[0];
  const isSwimlaneActive = activeSwimlane !== "none";

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
    const ruleStyle = getCardRuleStyle(item, defaultCardRules, variant.features.cardRules && cardRulesEnabled);

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
          <h1 className="text-sm font-semibold text-text-primary">Trakr</h1>
          <span className="text-text-tertiary">/</span>
          <span className="text-sm text-text-secondary">Board</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Swimlanes dropdown */}
          {variant.features.swimlanes && (
            <div className="relative">
              <button
                onClick={() => setSwimlaneDropdownOpen(!swimlaneDropdownOpen)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  isSwimlaneActive
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                    : "bg-surface text-text-secondary border-border hover:bg-surface-hover"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Swimlanes{isSwimlaneActive ? `: ${swimlaneDef.label}` : ""}
                <ChevronDown className="w-3 h-3" />
              </button>
              {swimlaneDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSwimlaneDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 w-56 bg-surface border border-border rounded-lg shadow-lg py-1">
                    <div className="px-3 py-1.5 text-[10px] text-text-tertiary uppercase tracking-wider">Group by TraQL</div>
                    {swimlaneOptions.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => { setActiveSwimlane(opt.id); setSwimlaneDropdownOpen(false); setCollapsedLanes(new Set()); }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-hover transition-colors ${
                          activeSwimlane === opt.id ? "text-indigo-600 font-medium" : "text-text-primary"
                        }`}
                      >
                        <div className="font-medium">{opt.label}</div>
                        {opt.traql && <div className="text-text-tertiary font-mono text-[10px] mt-0.5">{opt.traql}</div>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Card rules button */}
          {variant.features.cardRules && (
            <button
              onClick={() => setCardRulesPanelOpen(!cardRulesPanelOpen)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                cardRulesEnabled
                  ? "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100"
                  : "bg-surface text-text-secondary border-border hover:bg-surface-hover"
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              Card rules
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto relative">
        {/* Card rules side panel */}
        {variant.features.cardRules && cardRulesPanelOpen && (
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-surface border-l border-border z-30 shadow-lg flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-semibold text-text-primary">Card rules</span>
              </div>
              <button onClick={() => setCardRulesPanelOpen(false)} className="text-text-tertiary hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-xs text-text-secondary">Apply rules</span>
              <button
                onClick={() => setCardRulesEnabled(!cardRulesEnabled)}
                className={`w-8 h-[18px] rounded-full transition-colors relative ${cardRulesEnabled ? "bg-violet-500" : "bg-gray-300"}`}
              >
                <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform ${cardRulesEnabled ? "left-[17px]" : "left-[2px]"}`} />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <div className="px-3 py-2 text-[10px] text-text-tertiary uppercase tracking-wider">Conditional styling</div>
              {defaultCardRules.map((rule, i) => (
                <div key={rule.id} className="px-4 py-2.5 border-b border-border/50 hover:bg-surface-hover transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-text-tertiary w-4 text-center">{i + 1}</span>
                    <span className={`w-3 h-3 rounded-sm ${ruleSwatchColor[rule.id]}`} />
                    <span className="text-xs font-medium text-text-primary">{rule.label}</span>
                  </div>
                  <div className="ml-6">
                    <code className="text-[10px] font-mono text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">{rule.traql}</code>
                  </div>
                </div>
              ))}
              <div className="px-4 py-3 text-[10px] text-text-tertiary">
                First matching rule wins. Drag to reorder priority.
              </div>
            </div>
          </div>
        )}

        <div className="p-6">
          {boardState === "empty" ? (
            <div className="text-center py-20 text-sm text-text-tertiary">No items in this sprint.</div>
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
