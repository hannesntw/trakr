"use client";

import { useState } from "react";
import { useVariant } from "@/components/VariantContext";
import { StateIcon } from "@/components/StateIcon";
import { traqlReference } from "../backlog/traql";
import { Play, Star, Share2, Plus, Copy, X, ChevronDown, ChevronRight, BarChart3, Table2, MoreHorizontal, Pencil, Trash2, Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// --- Types ---

interface WorkItemResult {
  id: number; title: string; type: string; state: string; assignee: string; points: number | null;
}

interface AggregateResult {
  type: "scalar" | "grouped";
  label: string;
  value?: number;
  groups?: { key: string; value: number }[];
}

interface SavedQuery {
  id: number; name: string; query: string; starred: boolean; shared: boolean;
}

// --- Example queries for placeholder rotation ---
const EXAMPLE_QUERIES = [
  { query: "type:story is:open ORDER BY points DESC", label: "Open stories by points" },
  { query: "SELECT count() GROUP BY state", label: "Items per state" },
  { query: "children.state:all(done)", label: "Features with all stories done" },
  { query: 'SELECT format("- [{title}]({url})") WHERE sprint:active', label: "Sprint standup list" },
  { query: "SELECT count() GROUP BY sprint.health WHERE sprint:active", label: "Sprint health breakdown" },
  { query: "sprint.health:spilled", label: "What spilled last sprint?" },
  { query: "state WAS in_progress BEFORE 2026-01-01", label: "Was ever in progress before Jan" },
  { query: "assignee:empty type:story is:open", label: "Unassigned open stories" },
  { query: "links:blocked_by", label: "Blocked items" },
  { query: "SELECT sum(points) GROUP BY assignee WHERE sprint:active", label: "Points per person this sprint" },
  { query: "parent.type:epic state:in_progress", label: "In-progress features under epics" },
  { query: "sprint:future", label: "Planned for future sprints" },
  { query: "descendant.count:>10", label: "Epics with large subtrees" },
  { query: 'SELECT format("| {id} | {title} | {state} |") WHERE type:story is:open', label: "Markdown table of open stories" },
  { query: "updated:last(7d) is:open", label: "Recently active open items" },
  { query: "points:>=8 is:open", label: "Large open stories (8+ pts)" },
  { query: "type:bug", label: "All bugs" },
  { query: "sprint:active sprint.health:incomplete", label: "At-risk items this sprint" },
  { query: "state CHANGED FROM in_progress TO done", label: "Recently completed items" },
  { query: "SELECT count() GROUP BY project WHERE is:open", label: "Open items per project" },
];

// --- Mock data ---

const mockWorkItems: WorkItemResult[] = [
  { id: 302, title: "Create Work Item", type: "story", state: "done", assignee: "Peter", points: 3 },
  { id: 303, title: "View Sprint Board", type: "story", state: "done", assignee: "Peter", points: 5 },
  { id: 304, title: "View Backlog Table", type: "story", state: "done", assignee: "Sarah", points: 3 },
  { id: 307, title: "Plan Sprint", type: "story", state: "in_progress", assignee: "Hannes", points: 8 },
  { id: 308, title: "Create and Manage Sprints", type: "story", state: "ready", assignee: "Sarah", points: 5 },
  { id: 310, title: "Add and View Comments", type: "story", state: "new", assignee: "Unassigned", points: 3 },
  { id: 313, title: "Epic Timeline Bars", type: "story", state: "new", assignee: "Unassigned", points: 5 },
  { id: 314, title: "Drill-down to Features", type: "story", state: "new", assignee: "Unassigned", points: 3 },
];

const initialSavedQueries: SavedQuery[] = [
  { id: 1, name: "My open items", query: "assignee:me is:open", starred: true, shared: false },
  { id: 2, name: "Ready for sprint", query: "type:story state:ready", starred: true, shared: true },
  { id: 3, name: "Unassigned stories", query: "type:story assignee:none", starred: false, shared: false },
  { id: 4, name: "Sprint velocity", query: "SELECT sum(points) GROUP BY sprint.name WHERE type:story state:done", starred: false, shared: true },
  { id: 5, name: "Stories per feature", query: "SELECT count() GROUP BY parent.title WHERE type:story is:open", starred: true, shared: false },
  { id: 6, name: "Stale items", query: "is:stale ORDER BY updated ASC", starred: false, shared: false },
];

const typeBadge: Record<string, string> = {
  epic: "text-purple-600 bg-purple-50 border-purple-200",
  feature: "text-blue-600 bg-blue-50 border-blue-200",
  story: "text-emerald-600 bg-emerald-50 border-emerald-200",
};

// Syntax highlighting
function TraqlHighlight({ query, className }: { query: string; className?: string }) {
  const keywords = new Set(["AND", "OR", "NOT", "ORDER", "BY", "SELECT", "WHERE", "GROUP", "ASC", "DESC"]);
  const parts = query.split(/(\s+|[():,])/);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (/^\s+$/.test(part) || /^[():,]$/.test(part))
          return <span key={i} className="text-text-tertiary">{part}</span>;
        if (keywords.has(part))
          return <span key={i} className="text-purple-400 font-medium">{part}</span>;
        const colonIdx = part.indexOf(":");
        if (colonIdx > 0) {
          const field = part.slice(0, colonIdx);
          const value = part.slice(colonIdx + 1);
          return (
            <span key={i}>
              <span className="text-blue-400">{field}</span>
              <span className="text-text-tertiary">:</span>
              <span className="text-amber-400">{value}</span>
            </span>
          );
        }
        if (part.endsWith("()") || part.match(/^\w+\(/))
          return <span key={i} className="text-teal-400">{part}</span>;
        return <span key={i} className="text-text-primary">{part}</span>;
      })}
    </span>
  );
}

export default function QueriesPage() {
  const config = useVariant();
  const router = useRouter();

  useEffect(() => {
    if (!config.features.queryPage) router.replace(`/${config.id}/backlog`);
  }, [config, router]);

  if (!config.features.queryPage) return null;

  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [exampleIdx] = useState(() => Math.floor(Math.random() * EXAMPLE_QUERIES.length));
  const example = EXAMPLE_QUERIES[exampleIdx];
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [showRef, setShowRef] = useState(false);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  // Saved queries state
  const [savedList, setSavedList] = useState<SavedQuery[]>(initialSavedQueries);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [savingCurrent, setSavingCurrent] = useState(false);
  const [newQueryName, setNewQueryName] = useState("");

  // Mock: determine result type based on query
  const isAggregate = activeQuery?.startsWith("SELECT");
  const mockAggregate: AggregateResult = activeQuery?.includes("GROUP BY")
    ? {
        type: "grouped",
        label: activeQuery.includes("sum") ? "Sum of points" : "Count",
        groups: [
          { key: "Work Item Management", value: 16 },
          { key: "Sprint Planning", value: 13 },
          { key: "Work Item Comments", value: 3 },
          { key: "Timeline View", value: 8 },
        ],
      }
    : { type: "scalar", label: activeQuery?.includes("sum") ? "Sum of points" : activeQuery?.includes("avg") ? "Average points" : "Count", value: activeQuery?.includes("sum") ? 35 : activeQuery?.includes("avg") ? 4.4 : 8 };

  function runQuery() {
    setActiveQuery(query);
  }

  function toggleStar(id: number) {
    setSavedList(prev => prev.map(q => q.id === id ? { ...q, starred: !q.starred } : q));
  }

  function toggleShare(id: number) {
    setSavedList(prev => prev.map(q => q.id === id ? { ...q, shared: !q.shared } : q));
  }

  function deleteQuery(id: number) {
    setSavedList(prev => prev.filter(q => q.id !== id));
    setMenuOpenId(null);
  }

  function startEdit(sq: SavedQuery) {
    setEditingId(sq.id);
    setEditName(sq.name);
    setMenuOpenId(null);
  }

  function saveEdit(id: number) {
    setSavedList(prev => prev.map(q => q.id === id ? { ...q, name: editName } : q));
    setEditingId(null);
  }

  function saveCurrentQuery() {
    if (!newQueryName.trim() || !query.trim()) return;
    const newId = Math.max(...savedList.map(q => q.id), 0) + 1;
    setSavedList(prev => [...prev, { id: newId, name: newQueryName.trim(), query, starred: false, shared: false }]);
    setNewQueryName("");
    setSavingCurrent(false);
  }

  return (
    <>
      <header className="px-6 border-b border-border bg-surface shrink-0">
        <div className="h-14 flex items-center">
          <h1 className="text-sm font-semibold text-text-primary">Stori</h1>
          <span className="text-text-tertiary mx-3">/</span>
          <span className="text-sm text-text-secondary">Queries</span>
        </div>
      </header>

      <div className="flex-1 overflow-auto flex">
        {/* Saved queries sidebar */}
        <div className="w-64 border-r border-border bg-surface shrink-0 flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Saved Queries</span>
            <button onClick={() => setSavingCurrent(true)} className="text-text-tertiary hover:text-accent" title="Save current query">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {/* Save current query form */}
            {savingCurrent && (
              <div className="px-3 py-3 border-b border-border bg-accent/5">
                <input
                  autoFocus
                  value={newQueryName}
                  onChange={e => setNewQueryName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveCurrentQuery(); if (e.key === "Escape") setSavingCurrent(false); }}
                  placeholder="Query name..."
                  className="w-full px-2 py-1.5 text-xs bg-content-bg border border-border rounded text-text-primary outline-none focus:border-accent placeholder:text-text-tertiary"
                />
                <div className="mt-1.5 text-[10px] font-mono text-text-tertiary truncate">
                  <TraqlHighlight query={query} className="text-[10px]" />
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={saveCurrentQuery} disabled={!newQueryName.trim()} className="px-2 py-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-xs rounded">
                    Save
                  </button>
                  <button onClick={() => setSavingCurrent(false)} className="px-2 py-1 text-xs text-text-tertiary hover:text-text-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {savedList.length === 0 && !savingCurrent ? (
              /* Empty state */
              <div className="px-4 py-8 text-center">
                <Bookmark className="w-8 h-8 text-text-tertiary/30 mx-auto mb-3" />
                <p className="text-xs text-text-secondary mb-1">No saved queries yet</p>
                <p className="text-[10px] text-text-tertiary mb-3">
                  Write a TraQL query, then save it here for quick access. Share queries with your team.
                </p>
                <button onClick={() => setSavingCurrent(true)} className="text-xs text-accent hover:text-accent-hover">
                  Save current query
                </button>
              </div>
            ) : (
              savedList.map((sq) => (
                <div
                  key={sq.id}
                  className={`relative border-b border-border/50 hover:bg-content-bg transition-colors group ${activeQuery === sq.query ? "bg-accent/5" : ""}`}
                >
                  {editingId === sq.id ? (
                    /* Inline rename */
                    <div className="px-4 py-2.5">
                      <input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(sq.id); if (e.key === "Escape") setEditingId(null); }}
                        onBlur={() => saveEdit(sq.id)}
                        className="w-full px-1.5 py-0.5 -ml-1.5 text-xs bg-content-bg border border-accent rounded text-text-primary outline-none"
                      />
                    </div>
                  ) : (
                    <div
                      onClick={() => { setQuery(sq.query); setActiveQuery(sq.query); }}
                      className="w-full text-left px-4 py-2.5 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={e => { e.stopPropagation(); toggleStar(sq.id); }}
                          className="shrink-0"
                        >
                          {sq.starred ? (
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          ) : (
                            <Star className="w-3 h-3 text-text-tertiary opacity-0 group-hover:opacity-100 hover:text-amber-400" />
                          )}
                        </button>
                        <span className="text-xs text-text-primary font-medium truncate flex-1">{sq.name}</span>
                        {sq.shared && <Share2 className="w-3 h-3 text-accent/50 shrink-0" />}
                        <button
                          onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === sq.id ? null : sq.id); }}
                          className="shrink-0 opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-text-secondary"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="mt-1 ml-5 text-[10px] font-mono text-text-tertiary truncate">
                        <TraqlHighlight query={sq.query} className="text-[10px]" />
                      </div>
                    </div>
                  )}

                  {/* Context menu */}
                  {menuOpenId === sq.id && (
                    <div className="absolute right-2 top-8 bg-surface border border-border rounded-md shadow-xl z-30 min-w-[140px] py-1">
                      <button onClick={() => startEdit(sq)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-content-bg hover:text-text-primary">
                        <Pencil className="w-3 h-3" /> Rename
                      </button>
                      <button onClick={() => { navigator.clipboard?.writeText(sq.query); setMenuOpenId(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-content-bg hover:text-text-primary">
                        <Copy className="w-3 h-3" /> Copy query
                      </button>
                      <button onClick={() => { toggleShare(sq.id); setMenuOpenId(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-content-bg hover:text-text-primary">
                        <Share2 className="w-3 h-3" /> {sq.shared ? "Unshare" : "Share with team"}
                      </button>
                      <div className="border-t border-border my-1" />
                      <button onClick={() => deleteQuery(sq.id)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main query area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Query editor — action bar below textarea, both inside one border */}
          <div className="px-6 py-4 border-b border-border bg-surface">
            <div className="bg-content-bg border border-border rounded-lg focus-within:border-accent transition-colors">
              <div className="relative">
                <textarea
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); runQuery(); } }}
                  onFocus={() => setShowPlaceholder(false)}
                  onBlur={() => { if (!query) setShowPlaceholder(true); }}
                  aria-label="TraQL query editor"
                  className={`w-full px-4 py-3 text-sm bg-transparent outline-none text-text-primary font-mono resize-none min-h-[56px] ${showPlaceholder && !query ? "text-transparent caret-transparent" : ""}`}
                />
                {/* Overlay placeholder — looks like placeholder text but has interactive "Try it" */}
                {showPlaceholder && !query && (
                  <div
                    className="absolute inset-0 px-4 py-3 flex items-start gap-1.5"
                    onClick={(e) => { e.preventDefault(); setShowPlaceholder(false); }}
                  >
                    <span className="text-sm text-text-secondary/70">{example.label}:</span>
                    <code className="text-sm text-text-secondary/60 font-mono">{example.query}</code>
                    <span className="text-text-secondary/50 mx-1">—</span>
                    <button
                      className="text-sm text-accent hover:text-accent-hover font-medium pointer-events-auto"
                      onClick={(e) => { e.stopPropagation(); setQuery(example.query); setShowPlaceholder(false); }}
                    >
                      Try it
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center px-3 py-2 border-t border-border/50">
                <button
                  onClick={() => setShowRef(!showRef)}
                  className={`text-xs transition-colors ${showRef ? "text-accent" : "text-text-tertiary hover:text-accent"}`}
                >
                  {showRef ? "Hide reference" : "Language reference"}
                </button>
                <div className="ml-auto flex items-center gap-3">
                  <span className="text-[10px] text-text-tertiary">
                    {typeof navigator !== "undefined" && navigator.platform?.includes("Mac") ? "\u2318" : "Ctrl"}+Enter
                  </span>
                  <button
                    onClick={runQuery}
                    className="h-7 px-3 bg-accent hover:bg-accent-hover text-white text-xs rounded-md flex items-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3 h-3" /> Run
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Reference panel */}
          {showRef && (
            <div className="px-6 py-4 border-b border-border bg-surface/50 max-h-80 overflow-auto">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">TraQL Reference</span>
                <button onClick={() => setShowRef(false)} className="text-text-tertiary hover:text-text-secondary">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-1">
                {traqlReference.sections.map((section, si) => (
                  <div key={si}>
                    <button
                      onClick={() => setExpandedSection(expandedSection === si ? null : si)}
                      className="w-full flex items-center gap-2 py-1.5 text-xs text-text-primary hover:text-accent transition-colors"
                    >
                      {expandedSection === si ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      <span className="font-medium">{section.title}</span>
                      <span className="text-text-tertiary">— {section.description}</span>
                    </button>
                    {expandedSection === si && (
                      <div className="ml-5 mb-2 space-y-1">
                        {section.examples.map((ex, ei) => (
                          <div key={ei} className="flex items-center gap-3 py-0.5 group">
                            <button
                              onClick={() => setQuery(ex.query)}
                              className="font-mono text-[11px] hover:text-accent transition-colors"
                            >
                              <TraqlHighlight query={ex.query} className="text-[11px]" />
                            </button>
                            <span className="text-[10px] text-text-tertiary">{ex.note}</span>
                            <Copy className="w-3 h-3 text-text-tertiary opacity-0 group-hover:opacity-100 cursor-pointer shrink-0" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          <div className="flex-1 overflow-auto">
            {!activeQuery ? (
              <div className="text-center py-20">
                <p className="text-sm text-text-tertiary">Enter a TraQL query and press Run.</p>
              </div>
            ) : isAggregate ? (
              <div className="px-6 py-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 text-xs text-text-tertiary">
                    <BarChart3 className="w-3.5 h-3.5" />
                    Aggregate result
                  </div>
                  <div className="px-2 py-0.5 rounded bg-content-bg border border-border text-[10px] font-mono">
                    <TraqlHighlight query={activeQuery} className="text-[10px]" />
                  </div>
                </div>
                {mockAggregate.type === "scalar" ? (
                  <div className="inline-flex flex-col items-center p-8 bg-surface border border-border rounded-xl">
                    <span className="text-4xl font-bold text-text-primary">{mockAggregate.value}</span>
                    <span className="text-xs text-text-tertiary mt-2">{mockAggregate.label}</span>
                  </div>
                ) : (
                  <div className="max-w-md">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 text-xs font-medium text-text-tertiary">Group</th>
                          <th className="text-right py-2 text-xs font-medium text-text-tertiary pr-2">{mockAggregate.label}</th>
                          <th className="py-2 w-40"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockAggregate.groups!.map((g, i) => {
                          const max = Math.max(...mockAggregate.groups!.map(x => x.value));
                          return (
                            <tr key={i} className="border-b border-border/50">
                              <td className="py-2 text-sm text-text-primary">{g.key}</td>
                              <td className="py-2 text-sm text-text-primary text-right pr-2 font-mono">{g.value}</td>
                              <td className="py-2 px-2">
                                <div className="h-5 bg-content-bg rounded overflow-hidden">
                                  <div className="h-full bg-accent/20 rounded" style={{ width: `${(g.value / max) * 100}%` }} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="px-6 py-2 flex items-center gap-3 border-b border-border bg-content-bg">
                  <div className="flex items-center gap-2 text-xs text-text-tertiary">
                    <Table2 className="w-3.5 h-3.5" />
                    {mockWorkItems.length} results
                  </div>
                  <div className="px-2 py-0.5 rounded bg-surface border border-border text-[10px] font-mono">
                    <TraqlHighlight query={activeQuery} className="text-[10px]" />
                  </div>
                </div>
                <table className="w-full">
                  <thead className="sticky top-0 bg-content-bg z-10">
                    <tr className="border-b border-border text-left">
                      <th className="px-6 py-2.5 text-xs font-medium text-text-tertiary uppercase w-16">ID</th>
                      <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase w-24">Type</th>
                      <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase">Title</th>
                      <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase w-28">State</th>
                      <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase w-24">Assignee</th>
                      <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase w-16 text-right pr-6">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockWorkItems.map(item => (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-surface transition-colors cursor-pointer">
                        <td className="px-6 py-2.5 text-xs text-text-tertiary font-mono">#{item.id}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${typeBadge[item.type] ?? ""}`}>
                            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-sm text-text-primary">{item.title}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <StateIcon state={item.state} size={14} />
                            <span className="text-xs text-text-secondary">{item.state.replace("_", " ")}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-text-secondary">{item.assignee}</td>
                        <td className="px-3 py-2.5 text-xs text-text-tertiary text-right pr-6 font-mono">{item.points ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
