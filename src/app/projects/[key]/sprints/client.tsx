"use client";

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { Header } from "@/components/Header";
import { DetailPanel } from "@/components/DetailPanel";
import { StateBadge, IdBadge } from "@/components/Badge";
import { cn } from "@/lib/utils";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import {
  Circle, CircleDot, CircleCheck, Play,
  Pencil, Check, X, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import type { WorkItemState } from "@/lib/constants";

interface WorkItem {
  id: number;
  title: string;
  type: string;
  state: string;
  assignee: string | null;
  sprintId: number | null;
  points: number | null;
}

interface Sprint {
  id: number;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  state: string;
}

// State icon (inline)
function StateIcon({ state }: { state: string }) {
  const map: Record<string, { icon: typeof Circle; color: string }> = {
    new: { icon: Circle, color: "text-gray-400" },
    active: { icon: CircleDot, color: "text-blue-500" },
    ready: { icon: CircleDot, color: "text-amber-500" },
    in_progress: { icon: Play, color: "text-indigo-500" },
    done: { icon: CircleCheck, color: "text-emerald-500" },
  };
  const cfg = map[state] ?? map.new;
  const Icon = cfg.icon;
  return <Icon className={`w-3.5 h-3.5 ${cfg.color} shrink-0`} />;
}

// Generate virtual sprint blocks from a base date
function generateVirtualSprints(realSprints: Sprint[], baseDate: Date, count: number) {
  const blocks: Array<{
    id: number | null; // null = virtual (not in DB yet)
    virtualKey: string;
    number: number;
    name: string;
    goal: string;
    startDate: string;
    endDate: string;
    isoStart: string;
    isoEnd: string;
    state: "closed" | "active" | "future";
    real: boolean;
  }> = [];

  const now = new Date();

  for (let i = 0; i < count; i++) {
    const start = new Date(baseDate);
    start.setDate(start.getDate() + i * 14);
    const end = new Date(start);
    end.setDate(end.getDate() + 14);

    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    // Check if a real sprint exists for this slot
    const real = realSprints.find(
      (s) => s.startDate === startStr
    );

    const sprintState: "closed" | "active" | "future" =
      end < now ? "closed" : start <= now && now < end ? "active" : "future";

    blocks.push({
      id: real?.id ?? null,
      virtualKey: startStr,
      number: i + 1,
      name: real?.name ?? `Sprint ${i + 1}`,
      goal: real?.goal ?? "",
      startDate: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      endDate: end.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      isoStart: startStr,
      isoEnd: endStr,
      state: sprintState,
      real: !!real,
    });
  }

  return blocks;
}

interface SprintsClientProps {
  projectId: number;
  projectKey: string;
  projectName: string;
}

export function SprintsClient({ projectId, projectKey, projectName }: SprintsClientProps) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [backlogCollapsed, setBacklogCollapsed] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [draggingItemId, setDraggingItemId] = useState<number | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null); // virtualKey or "backlog"
  const activeRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const anchorVisualTop = useRef<number | null>(null);

  const fetchData = useCallback(async () => {
    const [sprintsRes, itemsRes] = await Promise.all([
      fetch(`/api/sprints?projectId=${projectId}`),
      fetch(`/api/work-items?projectId=${projectId}`),
    ]);
    setSprints(await sprintsRes.json());
    setItems(await itemsRes.json());
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeRefresh(fetchData);

  // Scroll to active sprint on mount
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [sprints.length]);

  // Preserve scroll on show/hide closed
  function toggleClosed() {
    const scrollEl = scrollRef.current;
    const anchorEl = activeRef.current;
    if (scrollEl && anchorEl) {
      anchorVisualTop.current = anchorEl.getBoundingClientRect().top;
    }
    setShowClosed(prev => !prev);
  }

  useLayoutEffect(() => {
    if (anchorVisualTop.current == null) return;
    const scrollEl = scrollRef.current;
    const anchorEl = activeRef.current;
    if (scrollEl && anchorEl) {
      const currentTop = anchorEl.getBoundingClientRect().top;
      scrollEl.scrollTop += currentTop - anchorVisualTop.current;
    }
    anchorVisualTop.current = null;
  }, [showClosed]);

  // Real sprints from DB
  const realBlocks = sprints.map(s => {
    const state: "closed" | "active" | "future" = s.state === "closed" ? "closed" : s.state === "active" ? "active" : "future";
    return {
      id: s.id as number | null,
      virtualKey: String(s.id),
      number: 0,
      name: s.name,
      goal: s.goal ?? "",
      startDate: s.startDate ? new Date(s.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
      endDate: s.endDate ? new Date(s.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
      isoStart: s.startDate ?? "",
      isoEnd: s.endDate ?? "",
      state,
      real: true,
    };
  });

  // Generate virtual future sprints extending beyond the last real sprint
  const lastReal = sprints.filter(s => s.endDate).sort((a, b) => (a.endDate! > b.endDate! ? 1 : -1)).at(-1);
  const futureStart = lastReal?.endDate ? new Date(lastReal.endDate) : new Date();
  const virtualBlocks: typeof realBlocks = [];
  for (let i = 0; i < 6; i++) {
    const start = new Date(futureStart);
    start.setDate(start.getDate() + i * 14);
    const end = new Date(start);
    end.setDate(end.getDate() + 14);
    const isoStart = start.toISOString().slice(0, 10);
    const isoEnd = end.toISOString().slice(0, 10);
    // Skip if a real sprint already covers this date
    if (realBlocks.some(b => b.isoStart === isoStart)) continue;
    const sprintNum = (realBlocks.length + i + 1);
    virtualBlocks.push({
      id: null,
      virtualKey: `virtual-${isoStart}`,
      number: sprintNum,
      name: `Sprint ${sprintNum}`,
      goal: "",
      startDate: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      endDate: end.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      isoStart,
      isoEnd,
      state: "future",
      real: false,
    });
  }

  const sprintBlocks = [...realBlocks, ...virtualBlocks];
  const closedBlocks = sprintBlocks.filter(s => s.state === "closed");
  const visibleBlocks = sprintBlocks.filter(s => s.state !== "closed");

  // Backlog items (stories not in any sprint)
  const backlogItems = items.filter(i => !i.sprintId && i.type === "story");

  // Get stories for a sprint
  function getSprintStories(sprintId: number | null): WorkItem[] {
    if (sprintId) return items.filter(i => i.sprintId === sprintId);
    return [];
  }

  // Drop handler: assign story to sprint (materialize if virtual)
  async function handleDrop(targetVirtualKey: string) {
    if (!draggingItemId) return;
    setDragOverTarget(null);
    setDraggingItemId(null);

    if (targetVirtualKey === "backlog") {
      // Move to backlog (remove sprint assignment)
      await fetch(`/api/work-items/${draggingItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sprintId: null }),
      });
    } else {
      // Find the sprint block
      const block = sprintBlocks.find(b => b.virtualKey === targetVirtualKey);
      if (!block) return;

      let sprintId = block.id;

      // Materialize if virtual
      if (!sprintId) {
        const res = await fetch("/api/sprints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            name: block.name,
            startDate: block.isoStart,
            endDate: block.isoEnd,
          }),
        });
        const newSprint = await res.json();
        sprintId = newSprint.id;
      }

      await fetch(`/api/work-items/${draggingItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sprintId }),
      });
    }

    fetchData();
  }

  return (
    <>
      <Header
        title={projectName}
        subtitle="Sprint Planning"
        actions={(() => {
          // Calculate velocity from closed sprints with stories that have points
          const closedWithPts = closedBlocks
            .filter(b => b.id)
            .map(b => {
              const stories = getSprintStories(b.id);
              const pts = stories.filter(s => s.state === "done").reduce((sum, s) => sum + (s.points ?? 0), 0);
              return pts;
            })
            .filter(pts => pts > 0);
          if (closedWithPts.length === 0) return null;
          const avg = Math.round(closedWithPts.reduce((a, b) => a + b, 0) / closedWithPts.length);
          return (
            <span className="text-xs text-text-secondary">
              Avg velocity: <strong className="text-text-primary">{avg} pts/sprint</strong>
            </span>
          );
        })()}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Backlog (collapsible) */}
        <div className={cn("border-r border-border flex flex-col overflow-hidden transition-[width] duration-200", backlogCollapsed ? "w-10" : "w-1/2")}>
          <div className="h-11 px-3 border-b border-border bg-surface flex items-center justify-between shrink-0">
            {!backlogCollapsed && (
              <h3 className="text-sm font-medium text-text-primary">
                Backlog
                <span className="ml-2 text-xs text-text-tertiary font-normal">{backlogItems.length}</span>
              </h3>
            )}
            <button onClick={() => setBacklogCollapsed(!backlogCollapsed)} className="p-1 rounded hover:bg-content-bg transition-colors text-text-tertiary hover:text-text-secondary">
              <div className="w-4 h-4 relative">
                <PanelLeftClose className={cn("w-4 h-4 absolute inset-0 transition-opacity duration-150", backlogCollapsed ? "opacity-0" : "opacity-100")} />
                <PanelLeftOpen className={cn("w-4 h-4 absolute inset-0 transition-opacity duration-150", backlogCollapsed ? "opacity-100" : "opacity-0")} />
              </div>
            </button>
          </div>
          {!backlogCollapsed && (
            <div
              className={cn("flex-1 overflow-auto p-3 space-y-1.5 transition-colors", dragOverTarget === "backlog" && "bg-accent/5 ring-2 ring-inset ring-accent/20 rounded")}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverTarget("backlog"); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverTarget(null); }}
              onDrop={(e) => { e.preventDefault(); handleDrop("backlog"); }}
            >
              {backlogItems.map(item => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => { setDraggingItemId(item.id); e.dataTransfer.effectAllowed = "move"; }}
                  onDragEnd={() => { setDraggingItemId(null); setDragOverTarget(null); }}
                  onClick={() => setSelectedId(item.id)}
                  className={cn("flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-sm cursor-grab active:cursor-grabbing hover:border-border-hover transition-colors", draggingItemId === item.id && "opacity-50")}
                >
                  <StateIcon state={item.state} />
                  <span className="flex-1 truncate">{item.title}</span>
                  <IdBadge id={item.id} />
                </div>
              ))}
              {backlogItems.length === 0 && (
                <div className="text-center py-8 text-xs text-text-tertiary">
                  {dragOverTarget === "backlog" ? "Drop here to unassign from sprint" : "All stories are assigned to sprints."}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Sprint blocks */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-11 px-4 border-b border-border bg-surface flex items-center justify-between shrink-0">
            <h3 className="text-sm font-medium text-text-primary">Sprints</h3>
            {closedBlocks.length > 0 && (
              <button onClick={toggleClosed} className="px-2 py-1 text-[11px] text-text-tertiary hover:text-text-secondary border border-border rounded-md hover:border-border-hover transition-colors">
                {showClosed ? "Hide" : "Show"} {closedBlocks.length} closed
              </button>
            )}
          </div>
          <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-3">
            {showClosed && closedBlocks.map(block => (
              <SprintBlock key={block.virtualKey} block={block} stories={getSprintStories(block.id)}
                onStoryClick={setSelectedId} draggingItemId={draggingItemId} setDraggingItemId={setDraggingItemId}
                dragOverTarget={dragOverTarget} setDragOverTarget={setDragOverTarget} onDrop={handleDrop} />
            ))}
            {visibleBlocks.map(block => (
              <div key={block.virtualKey} ref={block.state === "active" ? activeRef : undefined}>
                <SprintBlock block={block} stories={getSprintStories(block.id)}
                  onStoryClick={setSelectedId} draggingItemId={draggingItemId} setDraggingItemId={setDraggingItemId}
                  dragOverTarget={dragOverTarget} setDragOverTarget={setDragOverTarget} onDrop={handleDrop} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <DetailPanel
        workItemId={selectedId}
        projectKey={projectKey}
        onClose={() => setSelectedId(null)}
        onUpdated={fetchData}
      />
    </>
  );
}

// Sprint block component
function SprintBlock({
  block, stories, onStoryClick,
  draggingItemId, setDraggingItemId, dragOverTarget, setDragOverTarget, onDrop,
}: {
  block: ReturnType<typeof generateVirtualSprints>[0];
  stories: WorkItem[];
  onStoryClick: (id: number) => void;
  draggingItemId: number | null;
  setDraggingItemId: (id: number | null) => void;
  dragOverTarget: string | null;
  setDragOverTarget: (t: string | null) => void;
  onDrop: (virtualKey: string) => void;
}) {
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(block.goal);
  const isDropTarget = dragOverTarget === block.virtualKey;

  const stateStyles = {
    closed: "border-border/50 bg-content-bg/50",
    active: "border-accent/30 bg-accent-light/30 ring-1 ring-accent/20",
    future: "border-border bg-surface",
  };

  return (
    <div
      className={cn("border rounded-lg transition-colors", stateStyles[block.state], isDropTarget && "ring-2 ring-accent/40 bg-accent/5")}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverTarget(block.virtualKey); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverTarget(null); }}
      onDrop={(e) => { e.preventDefault(); onDrop(block.virtualKey); }}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">{block.name}</h3>
            {block.state === "active" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">Active</span>
            )}
            {block.state === "closed" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Closed</span>
            )}
          </div>
          <p className="text-[11px] text-text-tertiary mt-0.5">{block.startDate} – {block.endDate}</p>
        </div>
        {(() => {
          const totalPts = stories.reduce((sum, s) => sum + (s.points ?? 0), 0);
          const capacity = 30;
          const over = totalPts > capacity;
          return (
            <div className="flex items-center gap-3 shrink-0">
              {totalPts > 0 && (
                <span className={cn("text-[11px] font-medium", over ? "text-red-500" : "text-text-secondary")}>
                  {totalPts}/{capacity} pts
                </span>
              )}
              <span className="text-xs text-text-tertiary">{stories.length} items</span>
            </div>
          );
        })()}
      </div>

      {/* Goal */}
      {(block.goal || block.state !== "closed") && (
        <div className="px-4 pb-2">
          {editingGoal ? (
            <div className="flex items-center gap-1.5">
              <input autoFocus value={goalDraft} onChange={(e) => setGoalDraft(e.target.value)}
                className="flex-1 text-xs bg-transparent border-b border-accent outline-none py-0.5" placeholder="Sprint goal..." />
              <button onClick={() => setEditingGoal(false)} className="p-0.5 text-accent"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => { setGoalDraft(block.goal); setEditingGoal(false); }} className="p-0.5 text-text-tertiary"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1 group">
              <p className="text-xs text-text-secondary italic flex-1">{block.goal || "No goal set"}</p>
              <button onClick={() => setEditingGoal(true)} className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-text-tertiary hover:text-accent">
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stories */}
      <div className={cn("px-3 pb-3 space-y-1", stories.length === 0 && block.state !== "future" && !isDropTarget && "hidden")}>
        {stories.map(story => (
          <div key={story.id}
            draggable
            onDragStart={(e) => { setDraggingItemId(story.id); e.dataTransfer.effectAllowed = "move"; }}
            onDragEnd={() => { setDraggingItemId(null); setDragOverTarget(null); }}
            onClick={() => onStoryClick(story.id)}
            className={cn("flex items-center gap-2 px-2 py-1.5 rounded border border-border/50 hover:border-border hover:bg-content-bg transition-colors cursor-grab active:cursor-grabbing text-xs", draggingItemId === story.id && "opacity-50")}>
            <StateIcon state={story.state} />
            <span className="flex-1 truncate text-text-primary">{story.title}</span>
            <span className="text-text-tertiary">#{story.id}</span>
          </div>
        ))}
      </div>

      {/* Empty drop zone */}
      {stories.length === 0 && (block.state === "future" || isDropTarget) && (
        <div className="px-3 pb-3">
          <div className={cn("border border-dashed rounded py-3 text-center text-[11px] text-text-tertiary", isDropTarget ? "border-accent text-accent" : "border-border/50")}>
            {isDropTarget ? "Drop here" : "Drag stories here or assign from backlog"}
          </div>
        </div>
      )}

      {/* Velocity: delivered points on closed sprints */}
      {block.state === "closed" && stories.length > 0 && (() => {
        const delivered = stories.filter(s => s.state === "done").reduce((sum, s) => sum + (s.points ?? 0), 0);
        return delivered > 0 ? (
          <div className="px-4 pb-2 text-[11px] text-text-tertiary">
            Delivered: <span className="text-text-primary font-medium">{delivered} pts</span>
          </div>
        ) : null;
      })()}
    </div>
  );
}
