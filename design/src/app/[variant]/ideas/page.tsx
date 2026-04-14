"use client";

import { useState, useMemo } from "react";
import { useStateOverride } from "@/components/StateOverrideContext";
import { Search, X, Plus, ArrowUpRight, Trash2, ChevronDown, Check } from "lucide-react";

interface Idea {
  id: number;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  promoted: boolean;
}

const tagColors: Record<string, string> = {
  "ux": "bg-violet-100 text-violet-700",
  "performance": "bg-orange-100 text-orange-700",
  "api": "bg-blue-100 text-blue-700",
  "mobile": "bg-teal-100 text-teal-700",
  "export": "bg-amber-100 text-amber-700",
  "keyboard": "bg-rose-100 text-rose-700",
  "integration": "bg-indigo-100 text-indigo-700",
  "editor": "bg-emerald-100 text-emerald-700",
  "security": "bg-red-100 text-red-700",
  "docs": "bg-slate-100 text-slate-700",
};

function getTagColor(tag: string): string {
  return tagColors[tag] ?? "bg-gray-100 text-gray-600";
}

const defaultIdeas: Idea[] = [
  {
    id: 1,
    title: "Add dark mode support",
    body: "Users have been asking for a dark theme. Should follow system preference by default with a manual toggle in settings. Consider using CSS custom properties to make it easy to maintain.",
    tags: ["ux"],
    createdAt: "2026-04-12",
    promoted: false,
  },
  {
    id: 2,
    title: "Investigate performance issues on large boards",
    body: "Boards with 100+ items feel sluggish. Profile React renders and check if virtualization would help. Could also look into reducing re-renders with memo/useMemo.",
    tags: ["performance"],
    createdAt: "2026-04-11",
    promoted: false,
  },
  {
    id: 3,
    title: "API rate limiting per user -- look at token bucket",
    body: "We need rate limiting before opening the API. Token bucket algorithm seems like a good fit. Consider per-user and per-endpoint limits. Redis could handle the counters.",
    tags: ["api", "security"],
    createdAt: "2026-04-10",
    promoted: false,
  },
  {
    id: 4,
    title: "Mobile responsive layout for board view",
    body: "The board doesn't work well on phones. Maybe switch to a vertical layout on narrow screens, or offer a list view alternative. Swipe between columns?",
    tags: ["mobile", "ux"],
    createdAt: "2026-04-09",
    promoted: false,
  },
  {
    id: 5,
    title: "Export board as PNG for stakeholder updates",
    body: "Quick way to share board state without giving access. Render the board to canvas and export. Include project name, date, and filter state in the header.",
    tags: ["export"],
    createdAt: "2026-04-08",
    promoted: false,
  },
  {
    id: 6,
    title: "Keyboard shortcuts for common actions",
    body: "Power users need keyboard shortcuts. Start with: N for new item, / for search, J/K for navigation, E for edit, Esc to close panels. Show a cheat sheet with ?",
    tags: ["keyboard", "ux"],
    createdAt: "2026-04-07",
    promoted: false,
  },
  {
    id: 7,
    title: "Integrate with Slack for notifications",
    body: "Post updates to a Slack channel when items change state. Webhook-based, configurable per project. Could also support creating items from Slack messages via slash command.",
    tags: ["integration"],
    createdAt: "2026-04-06",
    promoted: false,
  },
  {
    id: 8,
    title: "Markdown preview in description editor",
    body: "Split-pane or toggle preview for the description field. Support GFM tables, checklists, and code blocks. Maybe add a toolbar for common formatting.",
    tags: ["editor", "ux"],
    createdAt: "2026-04-05",
    promoted: false,
  },
];

// Extended set for the "many" state override
const manyIdeas: Idea[] = [
  ...defaultIdeas,
  { id: 9, title: "Bulk import from CSV", body: "Allow importing work items from a CSV file. Map columns to fields. Show preview before committing.", tags: ["export"], createdAt: "2026-04-04", promoted: false },
  { id: 10, title: "Custom fields on work items", body: "Let users add their own fields: text, number, dropdown, date. Store as JSON. Show in table and detail views.", tags: ["ux"], createdAt: "2026-04-03", promoted: false },
  { id: 11, title: "Time tracking integration", body: "Track time spent on items. Manual entry or timer-based. Report hours per sprint/person.", tags: ["integration"], createdAt: "2026-04-02", promoted: false },
  { id: 12, title: "Email notifications for mentions", body: "When someone @mentions you in a comment, send an email. Batch digest option for noisy projects.", tags: ["integration"], createdAt: "2026-04-01", promoted: false },
  { id: 13, title: "Archive completed items", body: "Move done items to an archive after N days. Keep them searchable but out of the active backlog.", tags: ["ux"], createdAt: "2026-03-30", promoted: false },
  { id: 14, title: "Recurring tasks", body: "Create tasks that auto-recreate on a schedule. Useful for maintenance, reviews, deployments.", tags: ["ux"], createdAt: "2026-03-29", promoted: false },
  { id: 15, title: "Board background customization", body: "Let users pick a background color or image for their board. Fun personalization feature.", tags: ["ux"], createdAt: "2026-03-28", promoted: false },
  { id: 16, title: "Webhook support for external tools", body: "Fire webhooks on item create/update/delete. JSON payload with before/after state.", tags: ["api", "integration"], createdAt: "2026-03-27", promoted: false },
  { id: 17, title: "Two-factor authentication", body: "Add TOTP-based 2FA. Show QR code during setup. Require on login.", tags: ["security"], createdAt: "2026-03-26", promoted: false },
  { id: 18, title: "API documentation page", body: "Auto-generate API docs from route definitions. Interactive playground for trying endpoints.", tags: ["api", "docs"], createdAt: "2026-03-25", promoted: false },
  { id: 19, title: "Offline support with service worker", body: "Cache board data for offline viewing. Queue mutations and sync when back online.", tags: ["performance", "mobile"], createdAt: "2026-03-24", promoted: false },
  { id: 20, title: "Drag and drop file attachments", body: "Drop files onto a work item to attach them. Show thumbnails for images. Limit file size.", tags: ["ux", "editor"], createdAt: "2026-03-23", promoted: false },
  { id: 21, title: "Activity feed on dashboard", body: "Show recent changes across all projects. Filter by project, person, or change type.", tags: ["ux"], createdAt: "2026-03-22", promoted: false },
];

type SortMode = "newest" | "oldest" | "alpha";

export default function IdeasPage() {
  const ideasState = useStateOverride("ideas");

  const initialIdeas = ideasState === "many" ? manyIdeas : ideasState === "empty" ? [] : defaultIdeas;
  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas);
  const [searchText, setSearchText] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [quickAdd, setQuickAdd] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editTags, setEditTags] = useState("");

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    ideas.forEach(i => i.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [ideas]);

  const filtered = useMemo(() => {
    let result = ideas.filter(i => !i.promoted);
    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.body.toLowerCase().includes(q) ||
        i.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    if (tagFilter) {
      result = result.filter(i => i.tags.includes(tagFilter));
    }
    switch (sortMode) {
      case "newest": return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      case "oldest": return result.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      case "alpha": return result.sort((a, b) => a.title.localeCompare(b.title));
    }
  }, [ideas, searchText, tagFilter, sortMode]);

  function handleQuickAdd() {
    const title = quickAdd.trim();
    if (!title) return;
    const newIdea: Idea = {
      id: Date.now(),
      title,
      body: "",
      tags: [],
      createdAt: new Date().toISOString().split("T")[0],
      promoted: false,
    };
    setIdeas(prev => [newIdea, ...prev]);
    setQuickAdd("");
  }

  function handleDelete(id: number) {
    setIdeas(prev => prev.filter(i => i.id !== id));
  }

  function handlePromote(id: number) {
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, promoted: true } : i));
  }

  function startEdit(idea: Idea) {
    setEditingId(idea.id);
    setEditTitle(idea.title);
    setEditBody(idea.body);
    setEditTags(idea.tags.join(", "));
  }

  function saveEdit() {
    if (editingId === null) return;
    setIdeas(prev => prev.map(i =>
      i.id === editingId
        ? { ...i, title: editTitle, body: editBody, tags: editTags.split(",").map(t => t.trim()).filter(Boolean) }
        : i
    ));
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  const promotedCount = ideas.filter(i => i.promoted).length;

  return (
    <>
      <header className="px-6 border-b border-border bg-surface shrink-0">
        <div className="h-14 flex items-center">
          <h1 className="text-sm font-semibold text-text-primary">Ideas</h1>
          <span className="ml-3 text-xs text-text-tertiary">
            {filtered.length} idea{filtered.length !== 1 ? "s" : ""}
            {promotedCount > 0 && ` \u00B7 ${promotedCount} promoted`}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="h-8 flex items-center gap-1.5 px-2.5 text-xs border border-border rounded-md text-text-secondary hover:border-border-hover transition-colors"
              >
                Sort: {sortMode === "newest" ? "Newest" : sortMode === "oldest" ? "Oldest" : "A-Z"}
                <ChevronDown className="w-3 h-3" />
              </button>
              {sortOpen && (
                <div className="absolute top-full right-0 mt-1 bg-surface border border-border rounded-md shadow-lg z-20 min-w-[120px]">
                  {(["newest", "oldest", "alpha"] as SortMode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => { setSortMode(m); setSortOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-content-bg transition-colors ${sortMode === m ? "text-accent font-medium" : "text-text-secondary"}`}
                    >
                      {m === "newest" ? "Newest first" : m === "oldest" ? "Oldest first" : "Alphabetical"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search and tag filters */}
        <div className="pb-3 flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search ideas..."
              className="h-8 pl-8 pr-3 text-sm bg-content-bg border border-border rounded-md w-56 outline-none focus:border-accent text-text-primary placeholder:text-text-tertiary"
            />
            {searchText && (
              <button onClick={() => setSearchText("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className={`h-7 px-2.5 text-xs rounded-full transition-colors ${
                tagFilter === tag
                  ? "bg-accent text-white"
                  : `${getTagColor(tag)} hover:opacity-80`
              }`}
            >
              {tag}
            </button>
          ))}
          {(searchText || tagFilter) && (
            <button onClick={() => { setSearchText(""); setTagFilter(null); }} className="h-7 flex items-center gap-1 px-2 text-xs text-text-tertiary hover:text-text-secondary">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        {/* Quick add */}
        <div className="px-6 py-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Plus className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={quickAdd}
                onChange={e => setQuickAdd(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleQuickAdd(); }}
                placeholder="Capture an idea... press Enter to add"
                className="w-full h-10 pl-9 pr-4 text-sm bg-surface border border-border rounded-lg outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 text-text-primary placeholder:text-text-tertiary"
              />
            </div>
          </div>
        </div>

        {/* Ideas list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-text-tertiary">
              {searchText || tagFilter ? "No ideas match your search." : "No ideas yet. Start capturing thoughts above."}
            </p>
            {(searchText || tagFilter) && (
              <button onClick={() => { setSearchText(""); setTagFilter(null); }} className="mt-2 text-xs text-accent hover:text-accent-hover">Clear filters</button>
            )}
          </div>
        ) : (
          <div className="px-6 space-y-3 pb-6">
            {filtered.map(idea => (
              <div
                key={idea.id}
                className="bg-surface border border-border rounded-lg p-4 hover:border-border-hover transition-colors group"
              >
                {editingId === idea.id ? (
                  /* Inline edit mode */
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full text-sm font-medium bg-content-bg border border-border rounded-md px-3 py-1.5 outline-none focus:border-accent text-text-primary"
                      autoFocus
                    />
                    <textarea
                      value={editBody}
                      onChange={e => setEditBody(e.target.value)}
                      rows={3}
                      className="w-full text-sm bg-content-bg border border-border rounded-md px-3 py-1.5 outline-none focus:border-accent text-text-primary resize-none"
                    />
                    <input
                      type="text"
                      value={editTags}
                      onChange={e => setEditTags(e.target.value)}
                      placeholder="Tags (comma-separated)"
                      className="w-full text-xs bg-content-bg border border-border rounded-md px-3 py-1.5 outline-none focus:border-accent text-text-secondary"
                    />
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-accent text-white hover:bg-accent-hover transition-colors">
                        <Check className="w-3 h-3" /> Save
                      </button>
                      <button onClick={cancelEdit} className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-text-primary">{idea.title}</h3>
                        {idea.body && (
                          <p className="text-xs text-text-secondary mt-1 line-clamp-2">{idea.body}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => startEdit(idea)}
                          className="p-1.5 text-text-tertiary hover:text-text-primary rounded-md hover:bg-content-bg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handlePromote(idea.id)}
                          className="p-1.5 text-text-tertiary hover:text-accent rounded-md hover:bg-accent/5 transition-colors"
                          title="Promote to story"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(idea.id)}
                          className="p-1.5 text-text-tertiary hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2.5">
                      {idea.tags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                          className={`px-2 py-0.5 text-[11px] rounded-full ${getTagColor(tag)} hover:opacity-80 transition-opacity`}
                        >
                          {tag}
                        </button>
                      ))}
                      <span className="text-[11px] text-text-tertiary ml-auto">{idea.createdAt}</span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
