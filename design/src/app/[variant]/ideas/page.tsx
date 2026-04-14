"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useStateOverride } from "@/components/StateOverrideContext";
import {
  Search,
  X,
  Plus,
  ArrowUpRight,
  Trash2,
  Lightbulb,
  ZoomIn,
  ZoomOut,
  Maximize,
  Pencil,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */

interface Idea {
  id: number;
  title: string;
  body: string;
  createdAt: string; // ISO date
  x: number;
  y: number;
  colorIndex: number;
}

/* ── Mock data ──────────────────────────────────────────────── */

const RAW_IDEAS = [
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
    title: "API rate limiting — token bucket approach",
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

const EXTRA_IDEAS = [
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

/* Assign positions in a scattered layout */
function assignPositions(items: typeof RAW_IDEAS): Idea[] {
  const CARD_W = 210;
  const CARD_H = 160;
  const GAP = 30;
  const COLS = 5;
  return items.map((item, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    // Add some jitter so it looks organic, not a perfect grid
    const jitterX = ((item.id * 37) % 60) - 30;
    const jitterY = ((item.id * 53) % 40) - 20;
    return {
      ...item,
      x: 60 + col * (CARD_W + GAP) + jitterX,
      y: 60 + row * (CARD_H + GAP) + jitterY,
      colorIndex: item.id % BRAND_COLORS.length,
    };
  });
}

/* ── Helpers ─────────────────────────────────────────────────── */

function relativeTime(iso: string): string {
  const now = new Date("2026-04-13T12:00:00Z");
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

/* ── Sticky note color palette (Trakr brand tints) ────────── */

const BRAND_COLORS = [
  { hex: "#ef4444", label: "red" },
  { hex: "#3b82f6", label: "blue" },
  { hex: "#fbbf24", label: "amber" },
  { hex: "#10b981", label: "emerald" },
  { hex: "#8b5cf6", label: "violet" },
  { hex: "#f97316", label: "orange" },
  { hex: "#ec4899", label: "pink" },
  { hex: "#06b6d4", label: "cyan" },
];

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function brandCardColor(colorIndex: number) {
  const c = BRAND_COLORS[colorIndex % BRAND_COLORS.length];
  const { r, g, b } = hexToRgb(c.hex);
  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.08)`,
    border: `rgba(${r}, ${g}, ${b}, 0.25)`,
    dot: c.hex,
  };
}

function cardColor(id: number, colorOverride?: number) {
  const idx = colorOverride !== undefined ? colorOverride : id;
  return brandCardColor(idx);
}

/* ── Constants ─────────────────────────────────────────────── */

const CARD_WIDTH = 200;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

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
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-text-primary">Promote to Story</h2>
          </div>
          <p className="text-xs text-text-tertiary mt-1">
            This idea will become a story and appear on your board and backlog.
          </p>
        </div>
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

  const initialRaw =
    ideasState === "many"
      ? [...RAW_IDEAS, ...EXTRA_IDEAS]
      : ideasState === "empty"
      ? []
      : RAW_IDEAS;

  const [ideas, setIdeas] = useState<Idea[]>(() => assignPositions(initialRaw));
  const [searchText, setSearchText] = useState("");

  // Canvas state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // Interaction state
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, origX: 0, origY: 0 });
  const panStart = useRef({ x: 0, y: 0, origPanX: 0, origPanY: 0 });

  // Quick-add state
  const [quickTitle, setQuickTitle] = useState("");
  const [quickBody, setQuickBody] = useState("");
  const [quickExpanded, setQuickExpanded] = useState(false);
  const addFormRef = useRef<HTMLDivElement>(null);

  // Edit mode
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  // Promote dialog
  const [promoteIdea, setPromoteIdea] = useState<Idea | null>(null);

  // Last-added position for stacking new ideas
  const lastAddedPos = useRef<{ x: number; y: number } | null>(null);

  // Canvas ref
  const canvasRef = useRef<HTMLDivElement>(null);

  // Filtered ideas
  const filtered = useMemo(() => {
    if (!searchText) return ideas;
    const q = searchText.toLowerCase();
    return ideas.filter(
      (i) =>
        i.title.toLowerCase().includes(q) || i.body.toLowerCase().includes(q)
    );
  }, [ideas, searchText]);

  // Close quick-add form when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        addFormRef.current &&
        !addFormRef.current.contains(e.target as Node)
      ) {
        if (!quickTitle.trim() && !quickBody.trim()) {
          setQuickExpanded(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [quickTitle, quickBody]);

  /* ── Edit helpers ──────────────────────────────────────── */

  const startEditing = useCallback((idea: Idea) => {
    setEditingId(idea.id);
    setEditTitle(idea.title);
    setEditBody(idea.body);
  }, []);

  const saveEditing = useCallback(() => {
    if (editingId === null) return;
    const t = editTitle.trim();
    if (t) {
      setIdeas((prev) =>
        prev.map((i) =>
          i.id === editingId ? { ...i, title: t, body: editBody.trim() } : i
        )
      );
    }
    setEditingId(null);
  }, [editingId, editTitle, editBody]);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
  }, []);

  /* ── Color cycling ───────────────────────────────────── */

  const cycleColor = useCallback((id: number) => {
    setIdeas((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, colorIndex: (i.colorIndex + 1) % BRAND_COLORS.length }
          : i
      )
    );
  }, []);

  /* ── Card drag ─────────────────────────────────────────── */

  const handleCardMouseDown = useCallback(
    (e: React.MouseEvent, idea: Idea) => {
      if (editingId === idea.id) return; // don't drag while editing
      e.stopPropagation();
      e.preventDefault();
      setDraggingId(idea.id);
      setSelectedId(idea.id);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        origX: idea.x,
        origY: idea.y,
      };
    },
    [editingId]
  );

  const handleCardDoubleClick = useCallback(
    (e: React.MouseEvent, idea: Idea) => {
      e.stopPropagation();
      e.preventDefault();
      startEditing(idea);
    },
    [startEditing]
  );

  /* ── Canvas pan ────────────────────────────────────────── */

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only start pan if clicking on the canvas itself (not a card)
      if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvasBg === "true") {
        // Save any in-progress edit
        if (editingId !== null) saveEditing();
        setIsPanning(true);
        setSelectedId(null);
        panStart.current = {
          x: e.clientX,
          y: e.clientY,
          origPanX: pan.x,
          origPanY: pan.y,
        };
      }
    },
    [pan, editingId, saveEditing]
  );

  /* ── Mouse move (card drag or pan) ─────────────────────── */

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (draggingId !== null) {
        const dx = (e.clientX - dragStart.current.x) / zoom;
        const dy = (e.clientY - dragStart.current.y) / zoom;
        setIdeas((prev) =>
          prev.map((idea) =>
            idea.id === draggingId
              ? { ...idea, x: dragStart.current.origX + dx, y: dragStart.current.origY + dy }
              : idea
          )
        );
      } else if (isPanning) {
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        setPan({
          x: panStart.current.origPanX + dx,
          y: panStart.current.origPanY + dy,
        });
      }
    }

    function handleMouseUp() {
      setDraggingId(null);
      setIsPanning(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingId, isPanning, zoom]);

  /* ── Zoom (scroll wheel) ────────────────────────────────── */

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Trackpad-friendly: small multiplier, clamped per event
      const raw = -e.deltaY * 0.001;
      const delta = Math.max(-0.05, Math.min(0.05, raw));
      if (Math.abs(delta) < 0.0001) return;

      setZoom((prevZoom) => {
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prevZoom + delta));
        const scale = newZoom / prevZoom;
        // Zoom toward mouse position
        setPan((prevPan) => ({
          x: mouseX - scale * (mouseX - prevPan.x),
          y: mouseY - scale * (mouseY - prevPan.y),
        }));
        return newZoom;
      });
    }

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  /* ── Zoom controls ──────────────────────────────────────── */

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
  }, []);

  const handleFitAll = useCallback(() => {
    if (filtered.length === 0) return;
    const el = canvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const idea of filtered) {
      minX = Math.min(minX, idea.x);
      minY = Math.min(minY, idea.y);
      maxX = Math.max(maxX, idea.x + CARD_WIDTH);
      maxY = Math.max(maxY, idea.y + 140);
    }

    const contentW = maxX - minX + 80;
    const contentH = maxY - minY + 80;
    const scaleX = rect.width / contentW;
    const scaleY = rect.height / contentH;
    const newZoom = Math.min(Math.max(MIN_ZOOM, Math.min(scaleX, scaleY)), 1.5);

    setPan({
      x: (rect.width - contentW * newZoom) / 2 - minX * newZoom + 40 * newZoom,
      y: (rect.height - contentH * newZoom) / 2 - minY * newZoom + 40 * newZoom,
    });
    setZoom(newZoom);
  }, [filtered]);

  /* ── Quick add ──────────────────────────────────────────── */

  function handleQuickAdd() {
    const title = quickTitle.trim();
    if (!title) return;

    const el = canvasRef.current;
    let cx: number, cy: number;

    if (lastAddedPos.current) {
      // Stack below and slightly right of last added idea
      cx = lastAddedPos.current.x + 30;
      cy = lastAddedPos.current.y + 220;

      // Reset if off-screen
      if (el) {
        const rect = el.getBoundingClientRect();
        const screenX = cx * zoom + pan.x;
        const screenY = cy * zoom + pan.y;
        if (
          screenX < 0 ||
          screenX > rect.width - 100 ||
          screenY < 0 ||
          screenY > rect.height - 100
        ) {
          cx = (rect.width / 2 - pan.x) / zoom;
          cy = (rect.height / 2 - pan.y) / zoom;
        }
      }
    } else {
      // First add: center of viewport
      cx = 200;
      cy = 200;
      if (el) {
        const rect = el.getBoundingClientRect();
        cx = (rect.width / 2 - pan.x) / zoom;
        cy = (rect.height / 2 - pan.y) / zoom;
      }
    }

    lastAddedPos.current = { x: cx, y: cy };

    const newIdea: Idea = {
      id: Date.now(),
      title,
      body: quickBody.trim(),
      createdAt: new Date("2026-04-13T12:00:00Z").toISOString(),
      x: cx,
      y: cy,
      colorIndex: Date.now() % BRAND_COLORS.length,
    };
    setIdeas((prev) => [...prev, newIdea]);
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

  const showEmpty = filtered.length === 0;

  return (
    <>
      {/* Header bar */}
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

      {/* Canvas area */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden"
        style={{
          cursor: isPanning ? "grabbing" : draggingId ? "grabbing" : "default",
          background:
            `radial-gradient(circle, var(--color-text-tertiary) ${Math.max(0.5, 0.75 * zoom)}px, transparent ${Math.max(0.5, 0.75 * zoom)}px)`,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          backgroundColor: "var(--color-content-bg)",
        }}
        onMouseDown={handleCanvasMouseDown}
        data-canvas-bg="true"
      >
        {/* Transformed card layer */}
        {!showEmpty && (
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
            {filtered.map((idea, idx) => {
              const color = cardColor(idea.id, idea.colorIndex);
              const isSelected = selectedId === idea.id;
              const isDragging = draggingId === idea.id;
              const isEditing = editingId === idea.id;
              return (
                <div
                  key={idea.id}
                  onMouseDown={(e) => handleCardMouseDown(e, idea)}
                  onDoubleClick={(e) => handleCardDoubleClick(e, idea)}
                  style={{
                    position: "absolute",
                    left: idea.x,
                    top: idea.y,
                    width: CARD_WIDTH,
                    backgroundColor: color.bg,
                    borderColor: isSelected || isEditing ? "var(--color-accent)" : color.border,
                    zIndex: isDragging ? 999 : isEditing ? 998 : isSelected ? 100 : 1,
                    transition: isDragging ? "none" : "box-shadow 0.15s, border-color 0.15s",
                  }}
                  className={`group rounded-lg border p-3 select-none ${
                    isDragging
                      ? "shadow-xl scale-[1.03] rotate-[1deg]"
                      : isSelected || isEditing
                      ? "shadow-lg"
                      : "shadow-md hover:shadow-lg"
                  }`}
                >
                  {/* ID badge + color dot */}
                  <div className="flex items-center justify-between mb-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cycleColor(idea.id);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-2.5 h-2.5 rounded-full shrink-0 hover:scale-125 transition-transform"
                      style={{ backgroundColor: color.dot }}
                      title="Change color"
                    />
                    <span className="text-[10px] text-text-tertiary/50 font-mono leading-none">
                      #{idx + 1}
                    </span>
                  </div>

                  {isEditing ? (
                    /* ── Edit mode ── */
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") cancelEditing();
                          if (e.key === "Enter") saveEditing();
                        }}
                        autoFocus
                        className="w-full text-[13px] font-medium text-text-primary bg-white/60 border border-border rounded px-1.5 py-0.5 outline-none focus:border-accent"
                      />
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") cancelEditing();
                        }}
                        rows={2}
                        className="w-full mt-1.5 text-[11px] text-text-secondary bg-white/60 border border-border rounded px-1.5 py-0.5 outline-none focus:border-accent resize-none"
                      />
                    </div>
                  ) : (
                    /* ── View mode ── */
                    <>
                      <h3
                        className="text-[13px] font-medium text-text-primary leading-snug line-clamp-2"
                        style={{ cursor: "grab" }}
                      >
                        {idea.title}
                      </h3>
                      {idea.body && (
                        <p className="text-[11px] text-text-secondary/80 mt-1.5 leading-relaxed line-clamp-2">
                          {idea.body}
                        </p>
                      )}
                    </>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-black/[0.04]">
                    <span className="text-[10px] text-text-tertiary">
                      {relativeTime(idea.createdAt)}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(idea);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="p-1 text-text-tertiary hover:text-accent rounded hover:bg-white/60 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPromoteIdea(idea);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
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
                        onMouseDown={(e) => e.stopPropagation()}
                        className="p-1 text-text-tertiary hover:text-red-500 rounded hover:bg-white/60 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {showEmpty && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Lightbulb className="w-8 h-8 mx-auto text-text-tertiary/40 mb-3" />
              <p className="text-sm text-text-tertiary">
                {searchText
                  ? "No ideas match your search."
                  : "No ideas yet. Capture your first thought below."}
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
          </div>
        )}

        {/* Zoom controls — top-right */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-surface/90 backdrop-blur border border-border rounded-lg shadow-sm px-1 py-1 z-10">
          <button
            onClick={handleZoomOut}
            className="p-1.5 text-text-secondary hover:text-text-primary rounded hover:bg-content-bg transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] text-text-tertiary w-10 text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 text-text-secondary hover:text-text-primary rounded hover:bg-content-bg transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button
            onClick={handleFitAll}
            className="p-1.5 text-text-secondary hover:text-text-primary rounded hover:bg-content-bg transition-colors"
            title="Fit all cards"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Floating capture bar — bottom-center */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10" style={{ width: 420 }}>
          <div ref={addFormRef}>
            <div
              className={`bg-surface border rounded-xl transition-all ${
                quickExpanded
                  ? "border-accent shadow-lg"
                  : "border-border shadow-md hover:border-border-hover hover:shadow-lg"
              }`}
            >
              <div className="flex items-center">
                <Plus className="w-4 h-4 ml-3.5 text-text-tertiary shrink-0" />
                <input
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
                  tabIndex={1}
                  className="flex-1 h-11 px-2.5 text-sm bg-transparent outline-none text-text-primary placeholder:text-text-tertiary"
                />
                {quickExpanded && (
                  <button
                    onClick={handleQuickAdd}
                    disabled={!quickTitle.trim()}
                    tabIndex={3}
                    className="mr-3 h-7 px-3 text-xs font-medium rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Add
                  </button>
                )}
              </div>
              {quickExpanded && (
                <div className="px-3.5 pb-3">
                  <textarea
                    value={quickBody}
                    onChange={(e) => setQuickBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        handleQuickAdd();
                      }
                    }}
                    rows={2}
                    tabIndex={2}
                    placeholder="Add a description (optional)... Cmd+Enter to save"
                    className="w-full px-2.5 py-2 text-sm bg-content-bg border border-border rounded-md outline-none focus:border-accent text-text-primary placeholder:text-text-tertiary resize-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
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
