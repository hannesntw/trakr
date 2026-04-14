"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useStateOverride } from "@/components/StateOverrideContext";
import { Search, X, Plus, ArrowUpRight, Trash2, GripVertical, Lightbulb } from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */

interface Idea {
  id: number;
  title: string;
  body: string;
  createdAt: string; // ISO date
}

/* ── Mock data ──────────────────────────────────────────────── */

const defaultIdeas: Idea[] = [
  {
    id: 1,
    title: "Dark mode support",
    body: "Follow system preference by default with a manual toggle in settings. Use CSS custom properties for maintainability.",
    createdAt: "2026-04-13T10:30:00Z",
  },
  {
    id: 2,
    title: "Performance audit for large boards",
    body: "Boards with 100+ items feel sluggish. Profile React renders and investigate virtualization. Check memo/useMemo for unnecessary re-renders.",
    createdAt: "2026-04-13T08:15:00Z",
  },
  {
    id: 3,
    title: "API rate limiting \u2014 token bucket approach",
    body: "Need rate limiting before opening the API publicly. Token bucket algorithm per user and per endpoint. Redis for counters.",
    createdAt: "2026-04-12T16:45:00Z",
  },
  {
    id: 4,
    title: "Mobile responsive board layout",
    body: "Board doesn\u2019t work on phones. Switch to vertical layout on narrow screens or offer a list view. Swipe between columns?",
    createdAt: "2026-04-12T09:00:00Z",
  },
  {
    id: 5,
    title: "Export board as PNG for stakeholders",
    body: "Quick way to share board state without giving access. Render board to canvas and export with project name, date, and filter state in header.",
    createdAt: "2026-04-11T14:20:00Z",
  },
  {
    id: 6,
    title: "Keyboard shortcuts cheat sheet",
    body: "Power users need shortcuts. Start with N for new, / for search, J/K navigation, E for edit, Esc to close. Show cheat sheet with ?",
    createdAt: "2026-04-10T11:00:00Z",
  },
  {
    id: 7,
    title: "Slack notification integration",
    body: "Post updates to Slack when items change state. Webhook-based, configurable per project. Support creating items from Slack via slash command.",
    createdAt: "2026-04-09T17:30:00Z",
  },
  {
    id: 8,
    title: "Markdown preview in description editor",
    body: "Split-pane or toggle preview for the description field. Support GFM tables, checklists, and code blocks. Maybe add a toolbar.",
    createdAt: "2026-04-08T13:10:00Z",
  },
  {
    id: 9,
    title: "Bulk import from Jira CSV",
    body: "Allow importing work items from a Jira CSV export. Map columns to fields, show a preview before committing the import.",
    createdAt: "2026-04-07T10:00:00Z",
  },
  {
    id: 10,
    title: "Offline mode with sync",
    body: "Cache board data for offline viewing using a service worker. Queue mutations and sync when back online. Handle conflicts gracefully.",
    createdAt: "2026-04-06T15:45:00Z",
  },
];

const manyIdeas: Idea[] = [
  ...defaultIdeas,
  { id: 11, title: "Custom fields on work items", body: "Let users add their own fields: text, number, dropdown, date. Store as JSON.", createdAt: "2026-04-05T09:00:00Z" },
  { id: 12, title: "Time tracking integration", body: "Track time spent on items. Manual entry or timer-based. Report hours per sprint.", createdAt: "2026-04-04T14:00:00Z" },
  { id: 13, title: "Email notifications for mentions", body: "When someone @mentions you in a comment, send an email. Batch digest option.", createdAt: "2026-04-03T11:00:00Z" },
  { id: 14, title: "Archive completed items", body: "Move done items to an archive after N days. Keep searchable but out of backlog.", createdAt: "2026-04-02T16:00:00Z" },
  { id: 15, title: "Recurring tasks", body: "Tasks that auto-recreate on a schedule. Useful for maintenance and reviews.", createdAt: "2026-04-01T10:00:00Z" },
  { id: 16, title: "Webhook support for external tools", body: "Fire webhooks on item create/update/delete. JSON payload with before/after state.", createdAt: "2026-03-31T13:00:00Z" },
  { id: 17, title: "Two-factor authentication", body: "Add TOTP-based 2FA. Show QR code during setup. Require on login.", createdAt: "2026-03-30T09:00:00Z" },
  { id: 18, title: "API documentation page", body: "Auto-generate API docs from route definitions. Interactive playground.", createdAt: "2026-03-29T15:00:00Z" },
  { id: 19, title: "Board background customization", body: "Let users pick a background color or image for their board.", createdAt: "2026-03-28T12:00:00Z" },
  { id: 20, title: "Activity feed on dashboard", body: "Show recent changes across all projects. Filter by project or person.", createdAt: "2026-03-27T08:00:00Z" },
  { id: 21, title: "Drag and drop file attachments", body: "Drop files onto a work item to attach them. Show thumbnails for images.", createdAt: "2026-03-26T14:00:00Z" },
];

/* ── Helpers ─────────────────────────────────────────────────── */

function relativeTime(iso: string): string {
  const now = new Date("2026-04-13T12:00:00Z"); // fixed "now" for the click dummy
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "yesterday";
  if (diffDay < 30) return `${diffDay}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ── Sticky note color palette (rotate through) ─────────────── */

const cardColors = [
  "bg-amber-50 border-amber-200/60",
  "bg-sky-50 border-sky-200/60",
  "bg-violet-50 border-violet-200/60",
  "bg-emerald-50 border-emerald-200/60",
  "bg-rose-50 border-rose-200/60",
  "bg-orange-50 border-orange-200/60",
  "bg-teal-50 border-teal-200/60",
  "bg-indigo-50 border-indigo-200/60",
];

function cardColor(id: number) {
  return cardColors[id % cardColors.length];
}

/* ── Promote dialog ──────────────────────────────────────────── */

function PromoteDialog({
  idea,
  onPromote,
  onCancel,
}: {
  idea: Idea;
  onPromote: (id: number) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(idea.title);
  const [description, setDescription] = useState(idea.body);
  const [parent, setParent] = useState("");
  const [points, setPoints] = useState("");
  const [assignee, setAssignee] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === backdropRef.current) onCancel();
      }}
    >
      <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-text-primary">Promote to Story</h2>
          </div>
          <p className="text-xs text-text-tertiary mt-1">
            This idea will become a story and appear on your board and backlog.
          </p>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-9 px-3 text-sm bg-content-bg border border-border rounded-md outline-none focus:border-accent text-text-primary"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-content-bg border border-border rounded-md outline-none focus:border-accent text-text-primary resize-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Parent (feature)</label>
              <select
                value={parent}
                onChange={(e) => setParent(e.target.value)}
                className="w-full h-9 px-2 text-sm bg-content-bg border border-border rounded-md outline-none focus:border-accent text-text-secondary"
              >
                <option value="">None</option>
                <option value="work-item-mgmt">Work Item Management</option>
                <option value="sprint-planning">Sprint Planning</option>
                <option value="board-views">Board Views</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Story points</label>
              <select
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                className="w-full h-9 px-2 text-sm bg-content-bg border border-border rounded-md outline-none focus:border-accent text-text-secondary"
              >
                <option value="">--</option>
                {[1, 2, 3, 5, 8, 13].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Assignee</label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full h-9 px-2 text-sm bg-content-bg border border-border rounded-md outline-none focus:border-accent text-text-secondary"
              >
                <option value="">Unassigned</option>
                <option value="hannes">Hannes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 bg-content-bg/50">
          <button
            onClick={onCancel}
            className="h-8 px-3 text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onPromote(idea.id)}
            className="h-8 px-4 text-xs font-medium rounded-md bg-accent text-white hover:bg-accent-hover transition-colors flex items-center gap-1.5"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Promote
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */

export default function IdeasPage() {
  const ideasState = useStateOverride("ideas");

  const initialIdeas = ideasState === "many" ? manyIdeas : ideasState === "empty" ? [] : defaultIdeas;
  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas);
  const [searchText, setSearchText] = useState("");
  const [dragId, setDragId] = useState<number | null>(null);

  // Quick-add state
  const [quickTitle, setQuickTitle] = useState("");
  const [quickBody, setQuickBody] = useState("");
  const [quickExpanded, setQuickExpanded] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const addFormRef = useRef<HTMLDivElement>(null);

  // Promote dialog
  const [promoteIdea, setPromoteIdea] = useState<Idea | null>(null);

  // Close quick-add form when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (addFormRef.current && !addFormRef.current.contains(e.target as Node)) {
        if (!quickTitle.trim() && !quickBody.trim()) {
          setQuickExpanded(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [quickTitle, quickBody]);

  const filtered = useMemo(() => {
    if (!searchText) return ideas;
    const q = searchText.toLowerCase();
    return ideas.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.body.toLowerCase().includes(q)
    );
  }, [ideas, searchText]);

  function handleQuickAdd() {
    const title = quickTitle.trim();
    if (!title) return;
    const newIdea: Idea = {
      id: Date.now(),
      title,
      body: quickBody.trim(),
      createdAt: new Date("2026-04-13T12:00:00Z").toISOString(),
    };
    setIdeas((prev) => [newIdea, ...prev]);
    setQuickTitle("");
    setQuickBody("");
    setQuickExpanded(false);
  }

  function handleDelete(id: number) {
    setIdeas((prev) => prev.filter((i) => i.id !== id));
  }

  function handlePromote(id: number) {
    setIdeas((prev) => prev.filter((i) => i.id !== id));
    setPromoteIdea(null);
  }

  // Drag reorder
  const handleDragStart = useCallback((id: number) => {
    setDragId(id);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetId: number) => {
      e.preventDefault();
      if (dragId === null || dragId === targetId) return;
      setIdeas((prev) => {
        const fromIdx = prev.findIndex((i) => i.id === dragId);
        const toIdx = prev.findIndex((i) => i.id === targetId);
        if (fromIdx === -1 || toIdx === -1) return prev;
        const next = [...prev];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        return next;
      });
    },
    [dragId]
  );

  const handleDragEnd = useCallback(() => {
    setDragId(null);
  }, []);

  return (
    <>
      <header className="px-6 border-b border-border bg-surface shrink-0">
        <div className="h-14 flex items-center">
          <h1 className="text-sm font-semibold text-text-primary">Ideas</h1>
          <span className="ml-3 text-xs text-text-tertiary">
            {filtered.length} idea{filtered.length !== 1 ? "s" : ""}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search ideas..."
                className="h-8 pl-8 pr-3 text-sm bg-content-bg border border-border rounded-md w-56 outline-none focus:border-accent text-text-primary placeholder:text-text-tertiary"
              />
              {searchText && (
                <button
                  onClick={() => setSearchText("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        {/* Quick capture */}
        <div className="px-6 pt-5 pb-2">
          <div ref={addFormRef}>
            <div
              className={`bg-surface border rounded-lg transition-all ${
                quickExpanded
                  ? "border-accent shadow-sm"
                  : "border-border hover:border-border-hover"
              }`}
            >
              <div className="flex items-center">
                <Plus className="w-4 h-4 ml-3 text-text-tertiary shrink-0" />
                <input
                  ref={titleRef}
                  type="text"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  onFocus={() => setQuickExpanded(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleQuickAdd();
                    } else if (e.key === "Enter" && !quickExpanded) {
                      handleQuickAdd();
                    }
                  }}
                  placeholder="Capture an idea..."
                  className="flex-1 h-10 px-2 text-sm bg-transparent outline-none text-text-primary placeholder:text-text-tertiary"
                />
                {quickExpanded && (
                  <button
                    onClick={handleQuickAdd}
                    disabled={!quickTitle.trim()}
                    className="mr-2 h-7 px-3 text-xs font-medium rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Add
                  </button>
                )}
              </div>
              {quickExpanded && (
                <div className="px-3 pb-3">
                  <textarea
                    value={quickBody}
                    onChange={(e) => setQuickBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        handleQuickAdd();
                      }
                    }}
                    rows={2}
                    placeholder="Add a description (optional)... Cmd+Enter to save"
                    className="w-full px-2 py-1.5 text-sm bg-content-bg border border-border rounded-md outline-none focus:border-accent text-text-primary placeholder:text-text-tertiary resize-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Lightbulb className="w-8 h-8 mx-auto text-text-tertiary/40 mb-3" />
            <p className="text-sm text-text-tertiary">
              {searchText
                ? "No ideas match your search."
                : "No ideas yet. Capture your first thought above."}
            </p>
            {searchText && (
              <button
                onClick={() => setSearchText("")}
                className="mt-2 text-xs text-accent hover:text-accent-hover"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="px-6 py-4">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
              {filtered.map((idea) => (
                <div
                  key={idea.id}
                  draggable
                  onDragStart={() => handleDragStart(idea.id)}
                  onDragOver={(e) => handleDragOver(e, idea.id)}
                  onDragEnd={handleDragEnd}
                  className={`group relative rounded-lg border p-3.5 cursor-grab active:cursor-grabbing transition-all select-none ${cardColor(
                    idea.id
                  )} ${
                    dragId === idea.id
                      ? "opacity-50 scale-95 rotate-1"
                      : "hover:shadow-md hover:-translate-y-0.5"
                  }`}
                >
                  {/* Drag handle (visible on hover) */}
                  <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-3.5 h-3.5 text-text-tertiary/50" />
                  </div>

                  {/* Title */}
                  <h3 className="text-[13px] font-medium text-text-primary leading-snug pr-4 line-clamp-2">
                    {idea.title}
                  </h3>

                  {/* Description preview */}
                  {idea.body && (
                    <p className="text-xs text-text-secondary/80 mt-1.5 leading-relaxed line-clamp-3">
                      {idea.body}
                    </p>
                  )}

                  {/* Footer: time + hover actions */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/[0.04]">
                    <span className="text-[11px] text-text-tertiary">
                      {relativeTime(idea.createdAt)}
                    </span>

                    {/* Hover actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPromoteIdea(idea);
                        }}
                        className="p-1 text-text-tertiary hover:text-accent rounded hover:bg-white/60 transition-colors"
                        title="Promote to story"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(idea.id);
                        }}
                        className="p-1 text-text-tertiary hover:text-red-500 rounded hover:bg-white/60 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Promote dialog */}
      {promoteIdea && (
        <PromoteDialog
          idea={promoteIdea}
          onPromote={handlePromote}
          onCancel={() => setPromoteIdea(null)}
        />
      )}
    </>
  );
}
