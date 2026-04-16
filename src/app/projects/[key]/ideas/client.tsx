"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
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
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

/* -- Types ---------------------------------------------------- */

interface WorkItem {
  id: string;
  displayId: string | null;
  title: string;
  type: string;
  state: string;
  description: string | null;
  parentId: string | null;
  assignee: string | null;
  points: number | null;
  canvasX: number | null;
  canvasY: number | null;
  canvasColor: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Idea {
  id: string;
  displayId: string | null;
  title: string;
  body: string;
  createdAt: string;
  x: number;
  y: number;
  colorIndex: number;
}

interface ParentOption {
  id: string;
  displayId: string | null;
  title: string;
}

/* -- Helpers --------------------------------------------------- */

function relativeTime(iso: string): string {
  const now = new Date();
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

/* -- Sticky note color palette (Stori brand tints) ------------ */

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

function isDarkMode() {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute("data-theme") === "dark";
}

function brandCardColor(colorIndex: number) {
  const c = BRAND_COLORS[colorIndex % BRAND_COLORS.length];
  const { r, g, b } = hexToRgb(c.hex);
  const dark = isDarkMode();
  // Light mode: very subtle tint toward white. Dark mode: subtle tint toward dark bg.
  const base = dark ? 24 : 255; // #181818 vs #ffffff
  const strength = dark ? 0.15 : 0.08;
  const tintR = Math.round(base + (r - base) * strength);
  const tintG = Math.round(base + (g - base) * strength);
  const tintB = Math.round(base + (b - base) * strength);
  return {
    bg: `rgb(${tintR}, ${tintG}, ${tintB})`,
    border: `rgba(${r}, ${g}, ${b}, ${dark ? 0.35 : 0.25})`,
    dot: c.hex,
  };
}

function cardColor(id: string, colorOverride?: number) {
  const idx = colorOverride !== undefined ? colorOverride : id.charCodeAt(0) % BRAND_COLORS.length;
  return brandCardColor(idx);
}

function colorLabelToIndex(label: string | null): number {
  if (!label) return 0;
  const idx = BRAND_COLORS.findIndex((c) => c.label === label);
  return idx >= 0 ? idx : 0;
}

function workItemToIdea(wi: WorkItem): Idea {
  return {
    id: wi.id,
    displayId: wi.displayId,
    title: wi.title,
    body: wi.description ?? "",
    createdAt: wi.createdAt,
    x: wi.canvasX ?? 200,
    y: wi.canvasY ?? 200,
    colorIndex: colorLabelToIndex(wi.canvasColor),
  };
}

/* -- Constants ------------------------------------------------- */

const CARD_WIDTH = 200;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

/* -- Promote dialog ------------------------------------------- */

function PromoteDialog({
  idea,
  parents,
  onPromote,
  onCancel,
}: {
  idea: Idea;
  parents: ParentOption[];
  projectId: string;
  onPromote: (id: string, data: { title: string; description: string; parentId: string | null; points: number | null; assignee: string | null }) => void;
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
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayId ? `${p.displayId} ` : ""}{p.title}
                  </option>
                ))}
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
            onClick={() =>
              onPromote(idea.id, {
                title,
                description,
                parentId: parent || null,
                points: points ? Number(points) : null,
                assignee: assignee || null,
              })
            }
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

/* -- Main component ------------------------------------------- */

export function IdeasClient({
  projectId,
  projectKey,
  projectName,
}: {
  projectId: string;
  projectKey: string;
  projectName: string;
}) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [, setThemeTick] = useState(0);

  // Re-render cards when theme changes (dark mode affects card colors)
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === "data-theme") setThemeTick((t) => t + 1);
      }
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Canvas state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // Interaction state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lassoRect, setLassoRect] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const lassoStartSelection = useRef<Set<string>>(new Set());
  const dragStart = useRef({
    x: 0,
    y: 0,
    origPositions: new Map<string, { x: number; y: number }>(),
  });

  // Track mouse position for the floating selection badge
  const [dragMouse, setDragMouse] = useState<{ x: number; y: number } | null>(null);

  // Quick-add state
  const [quickTitle, setQuickTitle] = useState("");
  const [quickBody, setQuickBody] = useState("");
  const [quickExpanded, setQuickExpanded] = useState(false);
  const addFormRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  // Promote dialog
  const [promoteIdea, setPromoteIdea] = useState<Idea | null>(null);

  // Last-added position for stacking new ideas
  const lastAddedPos = useRef<{ x: number; y: number } | null>(null);

  // Canvas ref
  const canvasRef = useRef<HTMLDivElement>(null);

  // Debounce timer for position saves
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  /* -- Data fetching ------------------------------------------ */

  const fetchIdeas = useCallback(async () => {
    try {
      const res = await fetch(`/api/work-items?projectId=${projectId}&type=idea`);
      if (!res.ok) return;
      const data: WorkItem[] = await res.json();
      setIdeas(data.map(workItemToIdea));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchParents = useCallback(async () => {
    try {
      const res = await fetch(`/api/work-items?projectId=${projectId}&type=feature`);
      if (!res.ok) return;
      const data: WorkItem[] = await res.json();
      setParents(data.map((w) => ({ id: w.id, displayId: w.displayId, title: w.title })));
    } catch {
      // ignore
    }
  }, [projectId]);

  useEffect(() => {
    fetchIdeas();
    fetchParents();
  }, [fetchIdeas, fetchParents]);

  // Real-time refresh
  useRealtimeRefresh(fetchIdeas);

  /* -- API helpers -------------------------------------------- */

  const patchWorkItem = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      await fetch(`/api/work-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-stori-channel": "web" },
        body: JSON.stringify(data),
      });
    },
    []
  );

  const savePosition = useCallback(
    (id: string, x: number, y: number) => {
      const existing = saveTimers.current.get(id);
      if (existing) clearTimeout(existing);
      saveTimers.current.set(
        id,
        setTimeout(() => {
          patchWorkItem(id, { canvasX: Math.round(x), canvasY: Math.round(y) });
          saveTimers.current.delete(id);
        }, 300)
      );
    },
    [patchWorkItem]
  );

  const savePositionsBatch = useCallback(
    (positions: Map<string, { x: number; y: number }>) => {
      for (const [id, pos] of positions) {
        patchWorkItem(id, { canvasX: Math.round(pos.x), canvasY: Math.round(pos.y) });
      }
    },
    [patchWorkItem]
  );

  /* -- Filtered ideas ----------------------------------------- */

  const filtered = useMemo(() => {
    if (!searchText) return ideas;
    const q = searchText.toLowerCase();
    return ideas.filter(
      (i) =>
        i.title.toLowerCase().includes(q) || i.body.toLowerCase().includes(q)
    );
  }, [ideas, searchText]);

  /* -- Close quick-add form when clicking outside ------------- */

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

  /* -- Edit helpers ------------------------------------------- */

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
      patchWorkItem(editingId, { title: t, description: editBody.trim() });
    }
    setEditingId(null);
  }, [editingId, editTitle, editBody, patchWorkItem]);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
  }, []);

  /* -- Color cycling ------------------------------------------ */

  const cycleColor = useCallback(
    (id: string) => {
      setIdeas((prev) =>
        prev.map((i) => {
          if (i.id !== id) return i;
          const newIndex = (i.colorIndex + 1) % BRAND_COLORS.length;
          patchWorkItem(id, { canvasColor: BRAND_COLORS[newIndex].label });
          return { ...i, colorIndex: newIndex };
        })
      );
    },
    [patchWorkItem]
  );

  /* -- Card drag ---------------------------------------------- */

  const handleCardMouseDown = useCallback(
    (e: React.MouseEvent, idea: Idea) => {
      if (editingId === idea.id) return;
      e.stopPropagation();
      e.preventDefault();

      if (e.shiftKey) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(idea.id)) {
            next.delete(idea.id);
          } else {
            next.add(idea.id);
          }
          return next;
        });
        return;
      }

      let effectiveSelection: Set<string>;
      if (selectedIds.has(idea.id)) {
        effectiveSelection = selectedIds;
      } else {
        effectiveSelection = new Set([idea.id]);
        setSelectedIds(effectiveSelection);
      }

      const origPositions = new Map<string, { x: number; y: number }>();
      for (const id of effectiveSelection) {
        const card = ideas.find((i) => i.id === id);
        if (card) origPositions.set(id, { x: card.x, y: card.y });
      }

      setDraggingId(idea.id);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        origPositions,
      };
    },
    [editingId, selectedIds, ideas]
  );

  const handleCardDoubleClick = useCallback(
    (e: React.MouseEvent, idea: Idea) => {
      e.stopPropagation();
      e.preventDefault();
      startEditing(idea);
    },
    [startEditing]
  );

  /* -- Canvas mouse down (lasso) ------------------------------ */

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvasBg === "true") {
        if (editingId !== null) saveEditing();

        if (!e.shiftKey) {
          lassoStartSelection.current = new Set();
          setSelectedIds(new Set());
        } else {
          lassoStartSelection.current = new Set(selectedIds);
        }
        const rect = canvasRef.current?.getBoundingClientRect();
        const ox = rect ? e.clientX - rect.left : e.clientX;
        const oy = rect ? e.clientY - rect.top : e.clientY;
        setLassoRect({ startX: ox, startY: oy, currentX: ox, currentY: oy });
      }
    },
    [editingId, saveEditing, selectedIds]
  );

  /* -- Mouse move (card drag or lasso) ------------------------ */

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (draggingId !== null) {
        const dx = (e.clientX - dragStart.current.x) / zoom;
        const dy = (e.clientY - dragStart.current.y) / zoom;
        const origPositions = dragStart.current.origPositions;
        setDragMouse({ x: e.clientX, y: e.clientY });
        setIdeas((prev) =>
          prev.map((idea) => {
            const orig = origPositions.get(idea.id);
            if (orig) {
              return { ...idea, x: orig.x + dx, y: orig.y + dy };
            }
            return idea;
          })
        );
      } else if (lassoRect) {
        const el = canvasRef.current;
        const cRect = el?.getBoundingClientRect();
        const cx = cRect ? e.clientX - cRect.left : e.clientX;
        const cy = cRect ? e.clientY - cRect.top : e.clientY;
        const newRect = { ...lassoRect, currentX: cx, currentY: cy };
        setLassoRect(newRect);

        if (el) {
          const lx1 = (Math.min(newRect.startX, newRect.currentX) - pan.x) / zoom;
          const ly1 = (Math.min(newRect.startY, newRect.currentY) - pan.y) / zoom;
          const lx2 = (Math.max(newRect.startX, newRect.currentX) - pan.x) / zoom;
          const ly2 = (Math.max(newRect.startY, newRect.currentY) - pan.y) / zoom;

          const CARD_W = 200;
          const CARD_H = 140;
          const startSel = lassoStartSelection.current;
          const newSelection = new Set(startSel);

          ideas.forEach((idea) => {
            const cardRight = idea.x + CARD_W;
            const cardBottom = idea.y + CARD_H;
            const intersects =
              idea.x < lx2 && cardRight > lx1 && idea.y < ly2 && cardBottom > ly1;

            if (intersects) {
              if (startSel.has(idea.id)) {
                newSelection.delete(idea.id);
              } else {
                newSelection.add(idea.id);
              }
            } else {
              if (startSel.has(idea.id)) {
                newSelection.add(idea.id);
              } else {
                newSelection.delete(idea.id);
              }
            }
          });
          setSelectedIds(newSelection);
        }
      }
    }

    function handleMouseUp() {
      if (draggingId !== null) {
        // Save final positions for all dragged cards
        const origPositions = dragStart.current.origPositions;
        const finalPositions = new Map<string, { x: number; y: number }>();
        // Read current positions from state synchronously via a state setter that returns unchanged
        setIdeas((prev) => {
          for (const idea of prev) {
            if (origPositions.has(idea.id)) {
              finalPositions.set(idea.id, { x: idea.x, y: idea.y });
            }
          }
          return prev;
        });
        setTimeout(() => savePositionsBatch(finalPositions), 0);
      }
      setDraggingId(null);
      setDragMouse(null);
      setLassoRect(null);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingId, lassoRect, zoom, pan, ideas, savePosition, savePositionsBatch]);

  /* -- Pan (two-finger scroll) + Zoom (pinch / Ctrl+scroll) --- */

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        const rect = el!.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const raw = -e.deltaY * 0.01;
        const delta = Math.max(-0.1, Math.min(0.1, raw));
        if (Math.abs(delta) < 0.001) return;

        setZoom((prevZoom) => {
          const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prevZoom + delta));
          const scale = newZoom / prevZoom;
          setPan((prevPan) => ({
            x: mouseX - scale * (mouseX - prevPan.x),
            y: mouseY - scale * (mouseY - prevPan.y),
          }));
          return newZoom;
        });
      } else {
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    }

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  /* -- Zoom controls ------------------------------------------ */

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

  /* -- Quick add ---------------------------------------------- */

  async function handleQuickAdd() {
    const title = quickTitle.trim();
    if (!title) return;

    const el = canvasRef.current;
    let cx: number, cy: number;

    if (lastAddedPos.current) {
      cx = lastAddedPos.current.x;
      cy = lastAddedPos.current.y + 200;
    } else {
      cx = 200;
      cy = 200;
      if (el) {
        const rect = el.getBoundingClientRect();
        cx = (rect.width / 2 - pan.x) / zoom;
        cy = (rect.height / 2 - pan.y) / zoom;
      }
    }

    lastAddedPos.current = { x: cx, y: cy };

    const colorIndex = Date.now() % BRAND_COLORS.length;

    // Optimistic add with a temp id
    const tempId = `temp-${Date.now()}`;
    const tempIdea: Idea = {
      id: tempId,
      displayId: null,
      title,
      body: quickBody.trim(),
      createdAt: new Date().toISOString(),
      x: cx,
      y: cy,
      colorIndex,
    };
    setIdeas((prev) => [...prev, tempIdea]);
    setQuickTitle("");
    setQuickBody("");
    setQuickExpanded(true);
    requestAnimationFrame(() => {
      titleInputRef.current?.focus();
    });

    // Auto-pan
    if (el) {
      const rect = el.getBoundingClientRect();
      const screenX = cx * zoom + pan.x;
      const screenY = cy * zoom + pan.y;
      const margin = 80;
      if (
        screenX < margin ||
        screenX > rect.width - margin - CARD_WIDTH * zoom ||
        screenY < margin ||
        screenY > rect.height - margin - 180
      ) {
        setPan({
          x: rect.width / 2 - cx * zoom - (CARD_WIDTH / 2) * zoom,
          y: rect.height / 2 - cy * zoom - 80 * zoom,
        });
      }
    }

    // POST to server
    try {
      const res = await fetch("/api/work-items", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-stori-channel": "web" },
        body: JSON.stringify({
          projectId,
          title,
          type: "idea",
          description: quickBody.trim(),
          canvasX: Math.round(cx),
          canvasY: Math.round(cy),
          canvasColor: BRAND_COLORS[colorIndex].label,
        }),
      });
      if (res.ok) {
        const created: WorkItem = await res.json();
        setIdeas((prev) =>
          prev.map((i) => (i.id === tempId ? workItemToIdea(created) : i))
        );
      }
    } catch {
      setIdeas((prev) => prev.filter((i) => i.id !== tempId));
    }
  }

  /* -- Delete ------------------------------------------------- */

  async function handleDelete(id: string) {
    setIdeas((prev) => prev.filter((i) => i.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await fetch(`/api/work-items/${id}`, { method: "DELETE" });
  }

  /* -- Promote ------------------------------------------------ */

  async function handlePromote(
    id: string,
    data: {
      title: string;
      description: string;
      parentId: string | null;
      points: number | null;
      assignee: string | null;
    }
  ) {
    setIdeas((prev) => prev.filter((i) => i.id !== id));
    setPromoteIdea(null);
    await patchWorkItem(id, {
      type: "story",
      title: data.title,
      description: data.description,
      parentId: data.parentId,
      points: data.points,
      assignee: data.assignee,
    });
  }

  const showEmpty = filtered.length === 0 && !loading;

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
          cursor: draggingId ? "grabbing" : "default",
          background: `radial-gradient(circle, var(--color-text-tertiary) ${Math.max(
            0.5,
            0.75 * zoom
          )}px, transparent ${Math.max(0.5, 0.75 * zoom)}px)`,
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
            {filtered.map((idea) => {
              const color = cardColor(idea.id, idea.colorIndex);
              const isSelected = selectedIds.has(idea.id);
              const isDragging =
                draggingId !== null && dragStart.current.origPositions.has(idea.id);
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
                    borderColor:
                      isSelected || isEditing
                        ? "var(--color-accent)"
                        : color.border,
                    borderWidth: isSelected ? 2 : 1,
                    zIndex: isDragging ? 999 : isEditing ? 998 : isSelected ? 100 : 1,
                    transition: isDragging
                      ? "none"
                      : "box-shadow 0.15s, border-color 0.15s",
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
                      {idea.displayId ? `#${idea.displayId}` : ""}
                    </span>
                  </div>

                  {isEditing ? (
                    /* Edit mode */
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
                        className="w-full text-[13px] font-medium leading-snug text-text-primary bg-surface/60 border border-border rounded px-1.5 py-1 outline-none focus:border-accent"
                      />
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") cancelEditing();
                          if (e.key === "Enter" && !e.shiftKey) saveEditing();
                        }}
                        rows={Math.max(4, editBody.split("\n").length + 1)}
                        style={{ minHeight: 100 }}
                        className="w-full mt-1.5 text-[11px] leading-relaxed text-text-secondary bg-surface/60 border border-border rounded px-1.5 py-1 outline-none focus:border-accent resize-none"
                      />
                    </div>
                  ) : (
                    /* View mode */
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
                        className="p-1 text-text-tertiary hover:text-accent rounded hover:bg-surface/60 transition-colors"
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
                        className="p-1 text-text-tertiary hover:text-accent rounded hover:bg-surface/60 transition-colors"
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
                        className="p-1 text-text-tertiary hover:text-red-500 rounded hover:bg-surface/60 transition-colors"
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

        {/* Floating selection badge */}
        {selectedIds.size > 1 && (
          <div
            className="pointer-events-none z-20"
            style={
              dragMouse
                ? { position: "fixed", left: dragMouse.x + 16, top: dragMouse.y - 12 }
                : { position: "absolute", top: 12, left: 12 }
            }
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent text-white text-xs font-medium px-2.5 py-1 shadow-lg">
              {selectedIds.size} ideas
            </span>
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

        {/* Lasso selection rectangle */}
        {lassoRect && (
          <div
            className="absolute border-2 border-accent/50 bg-accent/10 rounded-sm pointer-events-none z-20"
            style={{
              left: Math.min(lassoRect.startX, lassoRect.currentX),
              top: Math.min(lassoRect.startY, lassoRect.currentY),
              width: Math.abs(lassoRect.currentX - lassoRect.startX),
              height: Math.abs(lassoRect.currentY - lassoRect.startY),
            }}
          />
        )}

        {/* Zoom controls */}
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

        {/* Floating capture bar */}
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
                  ref={titleInputRef}
                  type="text"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  onFocus={() => setQuickExpanded(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleQuickAdd();
                    } else if (e.key === "Enter" && quickTitle.trim()) {
                      e.preventDefault();
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
                        e.preventDefault();
                        handleQuickAdd();
                      } else if (e.key === "Enter" && e.shiftKey) {
                        e.preventDefault();
                        handleQuickAdd();
                      }
                    }}
                    rows={2}
                    tabIndex={2}
                    placeholder="Add a description (optional)... Shift+Enter to save"
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
          parents={parents}
          projectId={projectId}
          onPromote={handlePromote}
          onCancel={() => setPromoteIdea(null)}
        />
      )}
    </>
  );
}
