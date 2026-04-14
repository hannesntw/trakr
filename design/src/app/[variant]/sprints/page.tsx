"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useVariant } from "@/components/VariantContext";
import { useStateOverride } from "@/components/StateOverrideContext";
import { MockDetailPanel } from "@/components/MockDetailPanel";
import { Circle, CircleDot, CircleCheck, Play, Pencil, Check, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";

// --- Mock data ---

interface SprintBlock {
  id: number;
  number: number;
  startDate: string;
  endDate: string;
  name: string;
  goal: string;
  state: "closed" | "active" | "future";
  stories: { id: number; title: string; state: string }[];
}

const BASE = new Date("2026-03-30");
function sprintDate(weekOffset: number): string {
  const d = new Date(BASE);
  d.setDate(d.getDate() + weekOffset * 7);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function generateSprints(): SprintBlock[] {
  const sprints: SprintBlock[] = [];
  for (let i = 0; i < 12; i++) {
    const startWeek = i * 2;
    const state: SprintBlock["state"] = i < 3 ? "closed" : i === 3 ? "active" : "future";
    sprints.push({
      id: i + 1,
      number: i + 1,
      startDate: sprintDate(startWeek),
      endDate: sprintDate(startWeek + 2),
      name: `Sprint ${i + 1}`,
      goal: i === 3 ? "Timeline view with retrospective bars and state icons" : i === 4 ? "Collapsible sidebar and UI polish" : "",
      state,
      stories: i === 0 ? [
        { id: 302, title: "Create Work Item", state: "done" },
        { id: 303, title: "View Sprint Board", state: "done" },
      ] : i === 1 ? [
        { id: 304, title: "View Backlog Table", state: "done" },
        { id: 305, title: "View Work Item Detail", state: "done" },
      ] : i === 2 ? [
        { id: 307, title: "Plan Sprint", state: "done" },
        { id: 308, title: "Create and Manage Sprints", state: "done" },
      ] : i === 3 ? [
        { id: 51, title: "Timeline MVP", state: "done" },
        { id: 59, title: "Track Status Change History", state: "done" },
        { id: 60, title: "Show Retrospective Bars", state: "in_progress" },
        { id: 61, title: "Show State Icons", state: "in_progress" },
      ] : i === 4 ? [
        { id: 62, title: "Collapsible Sidebar", state: "new" },
        { id: 48, title: "Add and View Comments", state: "new" },
      ] : [],
    });
  }
  return sprints;
}

const backlogStories = [
  { id: 320, title: "Sprint Velocity Widget", state: "new" },
  { id: 321, title: "Comment Notifications", state: "new" },
  { id: 322, title: "Bulk State Change", state: "new" },
  { id: 323, title: "Custom Fields on Work Items", state: "new" },
];

// --- State icon ---
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

// --- Sprint block component ---
function SprintBlockCard({ sprint, variant, onStoryClick }: { sprint: SprintBlock; variant: ReturnType<typeof useVariant>; onStoryClick?: (story: { id: number; title: string; state: string }) => void }) {
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(sprint.goal);

  const stateStyles = {
    closed: "border-border/50 bg-content-bg/50",
    active: "border-accent/30 bg-accent-light/30 ring-1 ring-accent/20",
    future: "border-border bg-surface",
  };

  return (
    <div className={`border rounded-lg ${stateStyles[sprint.state]} transition-colors`}>
      {/* Sprint header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">{sprint.name}</h3>
            {sprint.state === "active" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">Active</span>
            )}
            {sprint.state === "closed" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Closed</span>
            )}
          </div>
          <p className="text-[11px] text-text-tertiary mt-0.5">{sprint.startDate} – {sprint.endDate}</p>
        </div>

        {variant.features.sprintCapacity && sprint.state !== "closed" && (
          <div className="text-[11px] text-text-secondary shrink-0">
            <span className="text-text-primary font-medium">{sprint.stories.length * 5}</span>/30 pts
          </div>
        )}

        <span className="text-xs text-text-tertiary shrink-0">{sprint.stories.length} items</span>
      </div>

      {/* Goal */}
      {(sprint.goal || sprint.state === "active" || sprint.state === "future") && (
        <div className="px-4 pb-2">
          {editingGoal ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                className="flex-1 text-xs bg-transparent border-b border-accent outline-none py-0.5"
                placeholder="Sprint goal..."
              />
              <button onClick={() => setEditingGoal(false)} className="p-0.5 text-accent"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => { setGoalDraft(sprint.goal); setEditingGoal(false); }} className="p-0.5 text-text-tertiary"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1 group">
              <p className="text-xs text-text-secondary italic flex-1">
                {sprint.goal || "No goal set"}
              </p>
              <button onClick={() => setEditingGoal(true)} className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-text-tertiary hover:text-accent">
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stories */}
      {sprint.stories.length > 0 && (
        <div className="px-3 pb-3 space-y-1">
          {sprint.stories.map((story) => (
            <div key={story.id} onClick={() => onStoryClick?.(story)} className="flex items-center gap-2 px-2 py-1.5 rounded border border-border/50 hover:border-border hover:bg-content-bg transition-colors cursor-pointer text-xs">
              <StateIcon state={story.state} />
              <span className="flex-1 truncate text-text-primary">{story.title}</span>
              <span className="text-text-tertiary">#{story.id}</span>
            </div>
          ))}
        </div>
      )}

      {/* Empty future sprint */}
      {sprint.stories.length === 0 && sprint.state === "future" && (
        <div className="px-3 pb-3">
          <div className="border border-dashed border-border/50 rounded py-3 text-center text-[11px] text-text-tertiary">
            Drag stories here or assign from backlog
          </div>
        </div>
      )}

      {/* Velocity (closed sprints) */}
      {variant.features.velocityTracking && sprint.state === "closed" && sprint.stories.length > 0 && (
        <div className="px-4 pb-2 text-[11px] text-text-tertiary">
          Delivered: <span className="text-text-primary font-medium">{sprint.stories.length * 5} pts</span>
        </div>
      )}
    </div>
  );
}

// --- Main page ---
export default function SprintsPage() {
  const variant = useVariant();
  const listState = useStateOverride("sprintList");
  const [showClosed, setShowClosed] = useState(false);
  const [selectedStory, setSelectedStory] = useState<{ id: number; title: string; state: string } | null>(null);
  const [backlogCollapsed, setBacklogCollapsed] = useState(false);
  const activeRef = useRef<HTMLDivElement>(null);
  const sprintScrollRef = useRef<HTMLDivElement>(null);
  const anchorVisualTop = useRef<number | null>(null);
  const isV2 = variant.features.sprintCapacity;

  const allSprints = generateSprints();
  const closedSprints = allSprints.filter(s => s.state === "closed");
  const visibleSprints = allSprints.filter(s => s.state !== "closed");

  // Before toggling closed sprints, snapshot where the active sprint is on screen
  function toggleClosed() {
    const scrollEl = sprintScrollRef.current;
    const anchorEl = activeRef.current;
    if (scrollEl && anchorEl) {
      anchorVisualTop.current = anchorEl.getBoundingClientRect().top;
    }
    setShowClosed(prev => !prev);
  }

  // After render, restore the active sprint to the same visual position
  useLayoutEffect(() => {
    if (anchorVisualTop.current == null) return;
    const scrollEl = sprintScrollRef.current;
    const anchorEl = activeRef.current;
    if (scrollEl && anchorEl) {
      const currentVisualTop = anchorEl.getBoundingClientRect().top;
      scrollEl.scrollTop += currentVisualTop - anchorVisualTop.current;
    }
    anchorVisualTop.current = null;
  }, [showClosed]);

  // Scroll to active sprint on mount
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, []);

  if (!isV2) {
    // Current variant: old tab-based UI
    return (
      <>
        <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
          <h1 className="text-sm font-semibold text-text-primary">Stori</h1>
          <span className="text-text-tertiary mx-3">/</span>
          <span className="text-sm text-text-secondary">Sprint Planning</span>
        </header>

        {listState === "empty" ? (
          <div className="text-center py-20 text-sm text-text-tertiary">No sprints created yet.</div>
        ) : (
          <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
            <div className="border-r border-border p-4">
              <h3 className="text-sm font-medium mb-3">Backlog <span className="text-xs text-text-tertiary font-normal">4 stories</span></h3>
              <div className="space-y-1.5">
                {backlogStories.map(s => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-sm cursor-pointer hover:border-border-hover">
                    <StateIcon state={s.state} />
                    {s.title}
                    <span className="ml-auto text-xs text-text-tertiary">#{s.id}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4">
              <h3 className="text-sm font-medium mb-3">Current Sprint <span className="text-xs text-text-tertiary font-normal">4 items</span></h3>
              <div className="space-y-1.5">
                {allSprints[3].stories.map(s => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-sm cursor-pointer hover:border-border-hover">
                    <StateIcon state={s.state} />
                    {s.title}
                    <span className="ml-auto text-xs text-text-tertiary">#{s.id}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Sprint v2: auto-generated sprint blocks
  return (
    <>
      <header className="h-14 px-6 flex items-center justify-between border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-text-primary">Stori</h1>
          <span className="text-text-tertiary">/</span>
          <span className="text-sm text-text-secondary">Sprint Planning</span>
        </div>
        {variant.features.velocityTracking && (
          <div className="text-xs text-text-secondary">
            Avg velocity: <span className="text-text-primary font-medium">28 pts/sprint</span>
          </div>
        )}
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Backlog (collapsible) */}
        <div className={`border-r border-border flex flex-col overflow-hidden transition-[width] duration-200 ${backlogCollapsed ? "w-10" : "w-1/2"}`}>
          <div className="h-11 px-3 border-b border-border bg-surface flex items-center justify-between shrink-0">
            {!backlogCollapsed && (
              <h3 className="text-sm font-medium text-text-primary">
                Backlog
                <span className="ml-2 text-xs text-text-tertiary font-normal">{backlogStories.length}</span>
              </h3>
            )}
            <button
              onClick={() => setBacklogCollapsed(!backlogCollapsed)}
              className="p-1 rounded hover:bg-content-bg transition-colors text-text-tertiary hover:text-text-secondary"
            >
              <div className="w-4 h-4 relative">
                <PanelLeftClose className={`w-4 h-4 absolute inset-0 transition-opacity duration-150 ${backlogCollapsed ? "opacity-0" : "opacity-100"}`} />
                <PanelLeftOpen className={`w-4 h-4 absolute inset-0 transition-opacity duration-150 ${backlogCollapsed ? "opacity-100" : "opacity-0"}`} />
              </div>
            </button>
          </div>
          {!backlogCollapsed && (
            <div className="flex-1 overflow-auto p-3 space-y-1.5">
              {backlogStories.map(s => (
                <div key={s.id} onClick={() => setSelectedStory(s)} className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-sm cursor-pointer hover:border-border-hover transition-colors">
                  <StateIcon state={s.state} />
                  <span className="flex-1 truncate">{s.title}</span>
                  <span className="text-xs text-text-tertiary">#{s.id}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Sprint blocks */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-11 px-4 border-b border-border bg-surface flex items-center justify-between shrink-0">
            <h3 className="text-sm font-medium text-text-primary">Sprints</h3>
            {closedSprints.length > 0 && (
              <button
                onClick={toggleClosed}
                className="px-2 py-1 text-[11px] text-text-tertiary hover:text-text-secondary border border-border rounded-md hover:border-border-hover transition-colors"
              >
                {showClosed ? "Hide" : "Show"} {closedSprints.length} closed
              </button>
            )}
          </div>
          <div ref={sprintScrollRef} className="flex-1 overflow-auto p-3 space-y-3">
            {showClosed && closedSprints.map(sprint => (
              <SprintBlockCard key={sprint.id} sprint={sprint} variant={variant} onStoryClick={setSelectedStory} />
            ))}
            {visibleSprints.map(sprint => (
              <div key={sprint.id} ref={sprint.state === "active" ? activeRef : undefined}>
                <SprintBlockCard sprint={sprint} variant={variant} onStoryClick={setSelectedStory} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedStory && (
        <MockDetailPanel
          itemId={selectedStory.id}
          title={selectedStory.title}
          type="story"
          state={selectedStory.state}
          onClose={() => setSelectedStory(null)}
        />
      )}
    </>
  );
}
