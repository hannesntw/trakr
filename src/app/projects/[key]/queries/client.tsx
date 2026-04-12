"use client";

import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { Header } from "@/components/Header";
import { TypeBadge, StateBadge, IdBadge } from "@/components/Badge";
import {
  Star,
  Plus,
  MoreHorizontal,
  Play,
  Copy,
  Pencil,
  Share2,
  Trash2,
  X,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkItemType } from "@/lib/constants";

// ---------- Types ----------

interface SavedQuery {
  id: number;
  projectId: number;
  userId: string;
  name: string;
  query: string;
  starred: boolean;
  shared: boolean;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
}

interface TraqlResult {
  type: "items" | "scalar" | "grouped" | "text";
  items?: Array<Record<string, unknown>>;
  value?: number;
  groups?: Array<{ key: string; value: number }>;
  text?: string[];
  count?: number;
  error?: string;
}

interface QueriesClientProps {
  projectId: number;
  projectKey: string;
  projectName: string;
}

// ---------- Syntax highlighting ----------

function highlightTraql(query: string): React.ReactNode[] {
  const keywords =
    /\b(AND|OR|NOT|SELECT|WHERE|GROUP\s+BY|ORDER\s+BY|ASC|DESC|LIMIT)\b/gi;
  const fieldValue = /(\w+)\s*[:=]\s*("[^"]*"|\S+)/g;
  const functions = /\b(count|sum|avg|min|max|today|now|last)\s*\(/gi;

  // Tokenize into spans
  type Span = { start: number; end: number; cls: string; text: string };
  const spans: Span[] = [];

  let m: RegExpExecArray | null;

  // Keywords
  const kwRe = new RegExp(keywords.source, "gi");
  while ((m = kwRe.exec(query)) !== null) {
    spans.push({
      start: m.index,
      end: m.index + m[0].length,
      cls: "text-purple-500 font-semibold",
      text: m[0],
    });
  }

  // Field:value
  const fvRe = new RegExp(fieldValue.source, "g");
  while ((m = fvRe.exec(query)) !== null) {
    const fieldStart = m.index;
    const fieldEnd = fieldStart + m[1].length;
    const valueStart = m.index + m[0].indexOf(m[2]);
    const valueEnd = valueStart + m[2].length;
    spans.push({
      start: fieldStart,
      end: fieldEnd,
      cls: "text-blue-500",
      text: m[1],
    });
    spans.push({
      start: valueStart,
      end: valueEnd,
      cls: "text-amber-600",
      text: m[2],
    });
  }

  // Functions
  const fnRe = new RegExp(functions.source, "gi");
  while ((m = fnRe.exec(query)) !== null) {
    spans.push({
      start: m.index,
      end: m.index + m[1].length,
      cls: "text-teal-500",
      text: m[1],
    });
  }

  // Sort spans by start and filter overlaps
  spans.sort((a, b) => a.start - b.start);
  const merged: Span[] = [];
  let lastEnd = 0;
  for (const s of spans) {
    if (s.start >= lastEnd) {
      merged.push(s);
      lastEnd = s.end;
    }
  }

  // Build nodes
  const nodes: React.ReactNode[] = [];
  let pos = 0;
  for (const s of merged) {
    if (s.start > pos) {
      nodes.push(
        <span key={`t-${pos}`}>{query.slice(pos, s.start)}</span>
      );
    }
    nodes.push(
      <span key={`h-${s.start}`} className={s.cls}>
        {s.text}
      </span>
    );
    pos = s.end;
  }
  if (pos < query.length) {
    nodes.push(<span key={`t-${pos}`}>{query.slice(pos)}</span>);
  }

  return nodes;
}

// ---------- Sidebar saved query item ----------

function SavedQueryItem({
  q,
  isActive,
  onSelect,
  onRename,
  onCopy,
  onToggleShare,
  onDelete,
  onToggleStar,
}: {
  q: SavedQuery;
  isActive: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onCopy: () => void;
  onToggleShare: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameName, setRenameName] = useState(q.name);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", onMouseDown);
      return () => document.removeEventListener("mousedown", onMouseDown);
    }
  }, [menuOpen]);

  return (
    <div
      className={cn(
        "group px-2 py-1.5 rounded-md cursor-pointer transition-colors",
        isActive ? "bg-surface" : "hover:bg-surface/50"
      )}
      onClick={() => {
        if (!renaming) onSelect();
      }}
    >
      <div className="flex items-center gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar();
          }}
          className="shrink-0"
        >
          <Star
            className={cn(
              "w-3.5 h-3.5",
              q.starred
                ? "fill-amber-400 text-amber-400"
                : "text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity"
            )}
          />
        </button>
        {renaming ? (
          <form
            className="flex-1 flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (renameName.trim()) {
                onRename(renameName.trim());
                setRenaming(false);
              }
            }}
          >
            <input
              autoFocus
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              className="flex-1 px-1.5 py-0.5 text-xs bg-content-bg border border-border rounded text-text-primary outline-none focus:border-accent"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Escape") setRenaming(false);
              }}
            />
          </form>
        ) : (
          <span className="flex-1 text-xs text-text-primary truncate font-medium">
            {q.name}
          </span>
        )}
        {q.shared && (
          <Share2 className="w-3 h-3 text-accent/50 shrink-0" />
        )}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-border/50 transition-opacity"
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-text-tertiary" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-md shadow-lg z-50 min-w-[140px] py-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  setRenameName(q.name);
                  setRenaming(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-content-bg transition-colors"
              >
                <Pencil className="w-3 h-3" /> Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onCopy();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-content-bg transition-colors"
              >
                <Copy className="w-3 h-3" /> Copy query
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onToggleShare();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-content-bg transition-colors"
              >
                <Share2 className="w-3 h-3" />{" "}
                {q.shared ? "Unshare" : "Share"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-content-bg transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
      {!renaming && (
        <div className="mt-0.5 pl-5 text-[11px] font-mono text-text-tertiary truncate leading-relaxed">
          {highlightTraql(q.query)}
        </div>
      )}
    </div>
  );
}

// ---------- Main component ----------

export function QueriesClient({
  projectId,
  projectKey,
  projectName,
}: QueriesClientProps) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<TraqlResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [activeQueryId, setActiveQueryId] = useState<number | null>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch saved queries
  const fetchSaved = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/saved-queries?projectId=${projectId}`
      );
      if (res.ok) {
        const data = await res.json();
        setSavedQueries(data);
      }
    } catch {
      // Silently fail — user may not be authenticated
    }
  }, [projectId]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  // Run query
  const runQuery = useCallback(async () => {
    if (!query.trim() || running) return;
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/traql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), projectId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Query execution failed");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error — could not reach server");
    } finally {
      setRunning(false);
    }
  }, [query, projectId, running]);

  // Keyboard shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        runQuery();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [runQuery]);

  // Save query
  async function handleSave() {
    if (!saveName.trim() || !query.trim()) return;
    const res = await fetch("/api/saved-queries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        name: saveName.trim(),
        query: query.trim(),
      }),
    });
    if (res.ok) {
      setShowSaveForm(false);
      setSaveName("");
      fetchSaved();
    }
  }

  // CRUD helpers
  async function handleRename(id: number, name: string) {
    await fetch(`/api/saved-queries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    fetchSaved();
  }

  async function handleToggleStar(id: number, current: boolean) {
    await fetch(`/api/saved-queries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ starred: !current }),
    });
    fetchSaved();
  }

  async function handleToggleShare(id: number, current: boolean) {
    await fetch(`/api/saved-queries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shared: !current }),
    });
    fetchSaved();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/saved-queries/${id}`, { method: "DELETE" });
    if (activeQueryId === id) setActiveQueryId(null);
    fetchSaved();
  }

  function handleCopy(queryText: string) {
    navigator.clipboard.writeText(queryText);
  }

  function selectSavedQuery(q: SavedQuery) {
    setQuery(q.query);
    setActiveQueryId(q.id);
    // Execute immediately
    setRunning(true);
    setError(null);
    setResult(null);
    fetch("/api/traql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q.query.trim(), projectId }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) setError(data.error ?? "Query execution failed");
        else setResult(data);
      })
      .catch(() => setError("Network error"))
      .finally(() => setRunning(false));
  }

  // ---------- Result renderers ----------

  function renderItems(items: Array<Record<string, unknown>>) {
    return (
      <div className="overflow-auto flex-1">
        <table className="w-full">
          <thead className="sticky top-0 bg-content-bg z-10">
            <tr className="border-b border-border text-left">
              <th className="px-4 py-2.5 text-xs font-medium text-text-tertiary uppercase tracking-wider w-16">
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
              <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase tracking-wider w-36">
                Assignee
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr
                key={item.id ? String(item.id) : i}
                className="border-b border-border/50 hover:bg-surface transition-colors cursor-pointer"
                onClick={() => {
                  if (item.id) window.location.href = `/projects/${projectKey}/work-items/${item.id}`;
                }}
              >
                <td className="px-4 py-2.5">
                  {item.id != null && <IdBadge id={Number(item.id)} />}
                </td>
                <td className="px-3 py-2.5">
                  {item.type ? (
                    <TypeBadge type={String(item.type) as WorkItemType} />
                  ) : null}
                </td>
                <td className="px-3 py-2.5 text-sm text-text-primary">
                  {String(item.title ?? "")}
                </td>
                <td className="px-3 py-2.5">
                  {item.state ? (
                    <StateBadge
                      state={String(item.state)}
                    />
                  ) : null}
                </td>
                <td className="px-3 py-2.5">
                  {item.assignee ? (
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold flex items-center justify-center shrink-0">
                        {String(item.assignee)
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                      <span className="text-xs text-text-secondary truncate">
                        {String(item.assignee)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-text-tertiary">--</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderScalar(value: number) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl font-bold text-text-primary tabular-nums">
            {value.toLocaleString()}
          </div>
          {result?.count != null && (
            <div className="mt-2 text-sm text-text-tertiary">
              {result.count} item{result.count !== 1 ? "s" : ""} matched
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderGrouped(groups: Array<{ key: string; value: number }>) {
    const maxValue = Math.max(...groups.map((g) => g.value), 1);
    return (
      <div className="overflow-auto flex-1">
        <table className="w-full">
          <thead className="sticky top-0 bg-content-bg z-10">
            <tr className="border-b border-border text-left">
              <th className="px-4 py-2.5 text-xs font-medium text-text-tertiary uppercase tracking-wider w-48">
                Group
              </th>
              <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase tracking-wider w-20 text-right">
                Value
              </th>
              <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase tracking-wider">
                Distribution
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr
                key={g.key}
                className="border-b border-border/50 hover:bg-surface transition-colors"
              >
                <td className="px-4 py-2.5 text-sm text-text-primary font-medium">
                  {g.key || "(none)"}
                </td>
                <td className="px-3 py-2.5 text-right text-sm text-text-primary font-mono tabular-nums">
                  {g.value.toLocaleString()}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-5 bg-border/30 rounded overflow-hidden">
                      <div
                        className="h-full bg-accent/70 rounded"
                        style={{
                          width: `${(g.value / maxValue) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderText(lines: string[]) {
    return (
      <div className="flex-1 overflow-auto relative">
        <button
          onClick={() =>
            navigator.clipboard.writeText(lines.join("\n"))
          }
          className="absolute top-3 right-3 p-1.5 rounded-md bg-surface hover:bg-border/50 transition-colors"
          title="Copy to clipboard"
        >
          <Copy className="w-3.5 h-3.5 text-text-tertiary" />
        </button>
        <pre className="px-4 py-3 text-sm text-text-primary font-mono whitespace-pre-wrap leading-relaxed">
          {lines.join("\n")}
        </pre>
      </div>
    );
  }

  function renderResult() {
    if (!result) return null;

    switch (result.type) {
      case "items":
        return result.items ? renderItems(result.items) : null;
      case "scalar":
        return result.value != null ? renderScalar(result.value) : null;
      case "grouped":
        return result.groups ? renderGrouped(result.groups) : null;
      case "text":
        return result.text ? renderText(result.text) : null;
      default:
        return null;
    }
  }

  // ---------- Render ----------

  const starredQueries = savedQueries.filter((q) => q.starred);
  const unstarredQueries = savedQueries.filter((q) => !q.starred);
  const sortedQueries = [...starredQueries, ...unstarredQueries];

  return (
    <>
      <Header title={projectName} subtitle="Queries" />
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — saved queries */}
        <div className="w-64 border-r border-border bg-content-bg flex flex-col shrink-0">
          <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
              Saved Queries
            </span>
            <button
              onClick={() => setShowSaveForm(true)}
              className="p-0.5 rounded hover:bg-surface transition-colors"
              title="Save current query"
            >
              <Plus className="w-3.5 h-3.5 text-text-tertiary" />
            </button>
          </div>

          {/* Save form */}
          {showSaveForm && (
            <div className="px-3 py-2 border-b border-border">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  autoFocus
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Query name..."
                  className="flex-1 px-2 py-1 text-xs bg-surface border border-border rounded text-text-primary outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={!saveName.trim() || !query.trim()}
                  className="px-2 py-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-xs rounded transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSaveForm(false);
                    setSaveName("");
                  }}
                  className="p-1 text-text-tertiary hover:text-text-secondary"
                >
                  <X className="w-3 h-3" />
                </button>
              </form>
            </div>
          )}

          {/* Queries list */}
          <div className="flex-1 overflow-auto px-1.5 py-1.5 space-y-0.5">
            {sortedQueries.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <FileText className="w-8 h-8 text-text-tertiary/40 mx-auto mb-2" />
                <p className="text-xs text-text-tertiary">
                  No saved queries yet
                </p>
                <p className="text-[11px] text-text-tertiary/70 mt-1">
                  Write a query and save it for quick access
                </p>
              </div>
            ) : (
              sortedQueries.map((q) => (
                <SavedQueryItem
                  key={q.id}
                  q={q}
                  isActive={activeQueryId === q.id}
                  onSelect={() => selectSavedQuery(q)}
                  onRename={(name) => handleRename(q.id, name)}
                  onCopy={() => handleCopy(q.query)}
                  onToggleShare={() => handleToggleShare(q.id, q.shared)}
                  onDelete={() => handleDelete(q.id)}
                  onToggleStar={() => handleToggleStar(q.id, q.starred)}
                />
              ))
            )}
          </div>
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor area */}
          <div className="px-6 pt-4 pb-2">
            <div className="border border-border rounded-lg overflow-hidden bg-surface">
              <textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Enter a TraQL query, e.g. type:bug AND state:active'
                className="w-full px-4 py-3 text-sm font-mono bg-transparent text-text-primary placeholder:text-text-tertiary outline-none resize-none"
                rows={4}
                spellCheck={false}
              />
              <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 bg-content-bg/50">
                <a
                  href="/docs/traql"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:text-accent-hover transition-colors"
                >
                  Language reference
                </a>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-text-tertiary hidden sm:inline">
                    {navigator.platform?.includes("Mac")
                      ? "\u2318"
                      : "Ctrl"}
                    +Enter to run
                  </span>
                  <button
                    onClick={runQuery}
                    disabled={!query.trim() || running}
                    className="flex items-center gap-1.5 px-3 py-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-xs font-medium rounded transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    {running ? "Running..." : "Run"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Results area */}
          <div className="flex-1 flex flex-col overflow-hidden px-6 pb-4">
            {error && (
              <div className="mb-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {result && (
              <div className="flex-1 flex flex-col overflow-hidden border border-border rounded-lg bg-surface">
                <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-content-bg/50">
                  <span className="text-xs text-text-tertiary font-medium">
                    Results
                    {result.type === "items" && result.items && (
                      <span className="ml-1.5 text-text-tertiary/70">
                        ({result.items.length} item
                        {result.items.length !== 1 ? "s" : ""})
                      </span>
                    )}
                    {result.type === "grouped" && result.groups && (
                      <span className="ml-1.5 text-text-tertiary/70">
                        ({result.groups.length} group
                        {result.groups.length !== 1 ? "s" : ""})
                      </span>
                    )}
                  </span>
                </div>
                {renderResult()}
              </div>
            )}

            {!result && !error && !running && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-text-tertiary">
                    Run a query to see results
                  </p>
                  <p className="text-xs text-text-tertiary/70 mt-1">
                    Use TraQL to search, filter, and aggregate work items
                  </p>
                </div>
              </div>
            )}

            {running && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-sm text-text-tertiary animate-pulse">
                  Executing query...
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
