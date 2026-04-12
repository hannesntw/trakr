"use client";

import { useState } from "react";
import { useVariant } from "@/components/VariantContext";
import { MockDetailPanel } from "@/components/MockDetailPanel";
import { ZoomIn, ZoomOut, ChevronRight, ChevronDown, Plus, Minus, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { StateIcon } from "@/components/StateIcon";
import { redirect } from "next/navigation";

interface StatusChange {
  toState: string;
  atWeek: number; // fractional week offset from base date
}

interface TimelineItem {
  id: number;
  title: string;
  type: "epic" | "feature" | "story";
  startWeek?: number;       // explicit for epics/features
  durationWeeks?: number;   // explicit for epics/features
  sprintIdx?: number;       // for stories: which sprint (0-based index)
  state: string;
  history?: StatusChange[];  // retrospective: when did status changes happen?
  children?: TimelineItem[];
}

// --- Data ---
// In "advanced" mode: epics/features have dates, stories derive from sprints.
// Story 320 is intentionally misaligned — its sprint (4) is outside its parent feature's range (0-4).

const timelineData: TimelineItem[] = [
  {
    id: 300, title: "Trakr Core", type: "epic", startWeek: 0, durationWeeks: 8, state: "active",
    children: [
      {
        id: 301, title: "Work Item Management", type: "feature", startWeek: 0, durationWeeks: 4, state: "active",
        children: [
          { id: 302, title: "Create Work Item", type: "story", sprintIdx: 0, state: "done",
            history: [{ toState: "active", atWeek: 0 }, { toState: "in_progress", atWeek: 0.3 }, { toState: "done", atWeek: 1.2 }] },
          { id: 303, title: "View Sprint Board", type: "story", sprintIdx: 0, state: "done",
            history: [{ toState: "active", atWeek: 0.2 }, { toState: "in_progress", atWeek: 0.8 }, { toState: "done", atWeek: 1.8 }] },
          { id: 304, title: "View Backlog Table", type: "story", sprintIdx: 1, state: "done",
            history: [{ toState: "active", atWeek: 1.5 }, { toState: "in_progress", atWeek: 2.0 }, { toState: "done", atWeek: 3.2 }] },
          { id: 305, title: "View Work Item Detail", type: "story", sprintIdx: 1, state: "in_progress",
            history: [{ toState: "active", atWeek: 2.0 }, { toState: "in_progress", atWeek: 2.8 }] },
        ],
      },
      {
        id: 306, title: "Sprint Planning", type: "feature", startWeek: 2, durationWeeks: 4, state: "in_progress",
        children: [
          { id: 307, title: "Plan Sprint", type: "story", sprintIdx: 2, state: "in_progress",
            history: [{ toState: "active", atWeek: 3.5 }, { toState: "in_progress", atWeek: 4.2 }] },
          { id: 308, title: "Create and Manage Sprints", type: "story", sprintIdx: 2, state: "ready" },
          // This story's sprint (Sprint 5, week 8-10) is OUTSIDE the feature's range (week 2-6) → error
          { id: 320, title: "Sprint Velocity Widget", type: "story", sprintIdx: 4, state: "new" },
        ],
      },
      {
        id: 309, title: "Work Item Comments", type: "feature", startWeek: 5, durationWeeks: 3, state: "new",
        children: [
          { id: 310, title: "Add and View Comments", type: "story", sprintIdx: 3, state: "new" },
          // No sprint assigned — should spread across parent feature
          { id: 321, title: "Comment Notifications", type: "story", state: "new" },
        ],
      },
    ],
  },
  {
    id: 311, title: "Timeline & Roadmap", type: "epic", startWeek: 6, durationWeeks: 6, state: "new",
    children: [
      {
        id: 312, title: "Timeline View", type: "feature", startWeek: 6, durationWeeks: 4, state: "new",
        children: [
          { id: 313, title: "Epic Timeline Bars", type: "story", sprintIdx: 3, state: "new" },
          { id: 314, title: "Drill-down to Features", type: "story", sprintIdx: 4, state: "new" },
        ],
      },
      {
        id: 315, title: "Roadmap Export", type: "feature", startWeek: 10, durationWeeks: 2, state: "new",
      },
    ],
  },
];

const sprints = [
  { name: "Sprint 1", startWeek: 0, durationWeeks: 2 },
  { name: "Sprint 2", startWeek: 2, durationWeeks: 2 },
  { name: "Sprint 3", startWeek: 4, durationWeeks: 2 },
  { name: "Sprint 4", startWeek: 6, durationWeeks: 2 },
  { name: "Sprint 5", startWeek: 8, durationWeeks: 2 },
  { name: "Sprint 6", startWeek: 10, durationWeeks: 2 },
];

// --- Milestones / date markers ---
const BASE_DATE = new Date("2026-03-30");
function weekToDate(week: number): string {
  const d = new Date(BASE_DATE);
  d.setDate(d.getDate() + week * 7);
  return d.toISOString().slice(0, 10);
}
function dateToWeek(dateStr: string): number {
  return (new Date(dateStr).getTime() - BASE_DATE.getTime()) / (7 * 24 * 60 * 60 * 1000);
}

const milestones = [
  { label: "Alpha Release", week: 4, color: "#F59E0B" },
  { label: "v1.0 Launch", week: 9, color: "#10B981" },
  { label: "Demo Day", week: 12, color: "#8B5CF6" },
];

// --- Dependency links ---
const links = [
  { sourceId: 301, targetId: 306, type: "blocks" as const }, // Work Item Mgmt blocks Sprint Planning
  { sourceId: 312, targetId: 315, type: "blocks" as const }, // Timeline View blocks Roadmap Export
  { sourceId: 309, targetId: 312, type: "relates" as const }, // Comments relates to Timeline View
];

const typeColors: Record<string, string> = {
  epic: "bg-purple-500",
  feature: "bg-blue-500",
  story: "bg-emerald-500",
};

const stateOpacity: Record<string, string> = {
  done: "opacity-40",
  active: "opacity-100",
  in_progress: "opacity-100",
  ready: "opacity-80",
  new: "opacity-60",
};

const ZOOM_LEVELS = [60, 80, 110, 150];
const TOTAL_WEEKS = 14;

function weekLabel(weekOffset: number): string {
  const base = new Date("2026-03-30");
  base.setDate(base.getDate() + weekOffset * 7);
  return base.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Resolve a story's position: from sprint, or spread across parent feature
interface ResolvedBar {
  startWeek: number;
  durationWeeks: number;
  error?: { type: "overflow"; featureEnd: number; sprintStart: number } | { type: "no-parent" };
}

function resolveStoryBar(
  item: TimelineItem,
  parentFeature: TimelineItem | null,
  storyIndexInParent: number,
  storySiblingCount: number,
  advanced: boolean,
): ResolvedBar | null {
  if (!advanced) {
    // Basic mode: use explicit values (legacy)
    if (item.startWeek != null && item.durationWeeks != null) {
      return { startWeek: item.startWeek, durationWeeks: item.durationWeeks };
    }
    return null;
  }

  // Advanced: stories derive position
  if (item.sprintIdx != null) {
    const sprint = sprints[item.sprintIdx];
    if (!sprint) return null;

    // Spread stories within their sprint: divide sprint duration among siblings in same sprint
    const bar: ResolvedBar = {
      startWeek: sprint.startWeek,
      durationWeeks: sprint.durationWeeks,
    };

    // Check for misalignment: sprint outside parent feature's range
    if (parentFeature && parentFeature.startWeek != null && parentFeature.durationWeeks != null) {
      const featureEnd = parentFeature.startWeek + parentFeature.durationWeeks;
      const sprintEnd = sprint.startWeek + sprint.durationWeeks;
      if (sprint.startWeek >= featureEnd || sprintEnd <= parentFeature.startWeek) {
        bar.error = { type: "overflow", featureEnd, sprintStart: sprint.startWeek };
      }
    }
    return bar;
  }

  // No sprint — spread across parent feature
  if (parentFeature && parentFeature.startWeek != null && parentFeature.durationWeeks != null) {
    const sliceWidth = parentFeature.durationWeeks / Math.max(storySiblingCount, 1);
    return {
      startWeek: parentFeature.startWeek + storyIndexInParent * sliceWidth,
      durationWeeks: sliceWidth,
    };
  }

  // No parent — can't place
  return null;
}

export default function TimelinePage() {
  const variant = useVariant();
  const [zoomIdx, setZoomIdx] = useState(1);
  const [expanded, setExpanded] = useState<Set<number>>(new Set([300]));
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showLinks, setShowLinks] = useState(true);
  const [showMarkerPanel, setShowMarkerPanel] = useState(false);
  const [showToday, setShowToday] = useState(true);
  const [markerList, setMarkerList] = useState(milestones);
  const [newMarkerLabel, setNewMarkerLabel] = useState("");
  const [newMarkerDate, setNewMarkerDate] = useState("2026-05-25");
  const [editingMarker, setEditingMarker] = useState<number | null>(null);
  const markerColors = ["#6366F1", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899"];
  const [dragging, setDragging] = useState<{ id: number; edge: "start" | "end"; origWeek: number } | null>(null);

  const advanced = variant.features.advancedPlanning;
  const hasMarkers = variant.features.timelineMarkers;
  const hasLinks = variant.features.timelineLinks;
  const hasDrag = variant.features.timelineDrag;

  // Fictional "today" at week 5.2 (~mid Sprint 3) so the mock data makes sense
  const todayOffset = 5.2;

  if (!variant.features.timelinePlanning) {
    redirect(`/${variant.id}/board`);
  }

  const weekWidth = ZOOM_LEVELS[zoomIdx];
  const totalWidth = TOTAL_WEEKS * weekWidth;

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  interface FlatRow {
    item: TimelineItem;
    depth: number;
    parentFeature: TimelineItem | null;
    storyIndex: number;
    storySiblings: number;
  }

  function flattenItems(items: TimelineItem[], depth = 0, parentFeature: TimelineItem | null = null): FlatRow[] {
    const result: FlatRow[] = [];
    for (const item of items) {
      const storySiblings = item.type !== "story" ? 0 : (parentFeature?.children?.filter(c => c.type === "story").length ?? 0);
      const storyIndex = item.type !== "story" ? 0 : (parentFeature?.children?.filter(c => c.type === "story").indexOf(item) ?? 0);
      result.push({ item, depth, parentFeature, storyIndex, storySiblings });
      if (item.children && expanded.has(item.id)) {
        const pf = item.type === "feature" ? item : parentFeature;
        result.push(...flattenItems(item.children, depth + 1, pf));
      }
    }
    return result;
  }

  function collectByDepth(items: TimelineItem[], depth = 0): Map<number, number[]> {
    const map = new Map<number, number[]>();
    for (const item of items) {
      if (item.children && item.children.length > 0) {
        map.set(depth, [...(map.get(depth) ?? []), item.id]);
        const childMap = collectByDepth(item.children, depth + 1);
        for (const [d, ids] of childMap) {
          map.set(d, [...(map.get(d) ?? []), ...ids]);
        }
      }
    }
    return map;
  }
  const depthMap = collectByDepth(timelineData);
  const maxDepth = Math.max(...depthMap.keys(), 0);

  function currentExpandDepth(): number {
    for (let d = maxDepth; d >= 0; d--) {
      const ids = depthMap.get(d) ?? [];
      if (ids.some((id) => expanded.has(id))) return d;
    }
    return -1;
  }

  function expandOneLevel() {
    const targetDepth = currentExpandDepth() + 1;
    if (targetDepth > maxDepth) return;
    const ids = depthMap.get(targetDepth) ?? [];
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }

  function collapseOneLevel() {
    const curDepth = currentExpandDepth();
    if (curDepth < 0) return;
    const ids = depthMap.get(curDepth) ?? [];
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }

  const rows = flattenItems(timelineData);

  function getBar(row: FlatRow): ResolvedBar | null {
    const { item, parentFeature, storyIndex, storySiblings } = row;
    if (item.type === "story") {
      return resolveStoryBar(item, parentFeature, storyIndex, storySiblings, advanced);
    }
    if (item.startWeek != null && item.durationWeeks != null) {
      return { startWeek: item.startWeek, durationWeeks: item.durationWeeks };
    }
    return null;
  }

  return (
    <>
      <header className="h-14 px-6 flex items-center justify-between border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-text-primary">Trakr</h1>
          <span className="text-text-tertiary">/</span>
          <span className="text-sm text-text-secondary">Timeline</span>
          {advanced && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
              Advanced
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Markers panel */}
          {hasMarkers && (
            <div className="relative">
              <button
                onClick={() => setShowMarkerPanel(!showMarkerPanel)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${showMarkerPanel ? "border-accent text-accent bg-accent-light" : "border-border text-text-tertiary"}`}
              >
                Markers ({markerList.length})
              </button>
              {showMarkerPanel && (
                <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-xl z-50 w-80 p-3" style={{ maxHeight: "80vh", overflowY: "auto" }}>
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                    <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Today line</span>
                    <button onClick={() => setShowToday(!showToday)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${showToday ? "border-red-300 text-red-500 bg-red-50" : "border-border text-text-tertiary"}`}>
                      {showToday ? "On" : "Off"}
                    </button>
                  </div>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2">Date Markers</p>
                  <div className="space-y-1 mb-3">
                    {markerList.map((m, i) => (
                      editingMarker === i ? (
                        <div key={i} className="bg-content-bg rounded p-2 space-y-1.5">
                          <div className="flex gap-1.5">
                            <input value={m.label} onChange={e => setMarkerList(markerList.map((mk, j) => j === i ? { ...mk, label: e.target.value } : mk))}
                              className="flex-1 px-2 py-1 text-xs border border-border rounded bg-surface" />
                          </div>
                          <div className="flex gap-1.5 items-center">
                            <input type="date" value={weekToDate(m.week)} onChange={e => setMarkerList(markerList.map((mk, j) => j === i ? { ...mk, week: dateToWeek(e.target.value) } : mk))}
                              className="flex-1 px-2 py-1 text-xs border border-border rounded bg-surface" />
                            <div className="flex gap-1">
                              {markerColors.map(c => (
                                <button key={c} onClick={() => setMarkerList(markerList.map((mk, j) => j === i ? { ...mk, color: c } : mk))}
                                  className={`w-4 h-4 rounded-full ${m.color === c ? "ring-2 ring-offset-1 ring-accent" : ""}`} style={{ backgroundColor: c }} />
                              ))}
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <button onClick={() => setEditingMarker(null)} className="text-xs text-accent">Done</button>
                          </div>
                        </div>
                      ) : (
                        <div key={i} className="flex items-center gap-2 text-xs px-1.5 py-2 rounded hover:bg-content-bg group">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                          <span className="flex-1 text-text-primary">{m.label}</span>
                          <span className="text-text-tertiary text-[10px]">{weekToDate(m.week)}</span>
                          <button onClick={() => setEditingMarker(i)} title="Edit"
                            className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-accent transition-opacity p-0.5">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => { setMarkerList(markerList.filter((_, j) => j !== i)); if (editingMarker === i) setEditingMarker(null); }} title="Delete"
                            className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-red-500 transition-opacity p-0.5">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )
                    ))}
                  </div>
                  <div className="border-t border-border pt-2 space-y-1.5">
                    <div className="flex gap-1.5">
                      <input value={newMarkerLabel} onChange={e => setNewMarkerLabel(e.target.value)} placeholder="Label" className="flex-1 px-2 py-1 text-xs border border-border rounded bg-content-bg" />
                      <input type="date" value={newMarkerDate} onChange={e => setNewMarkerDate(e.target.value)} className="px-2 py-1 text-xs border border-border rounded bg-content-bg" />
                    </div>
                    <button onClick={() => { if (newMarkerLabel.trim()) { setMarkerList([...markerList, { label: newMarkerLabel.trim(), week: dateToWeek(newMarkerDate), color: markerColors[markerList.length % markerColors.length] }]); setNewMarkerLabel(""); } }}
                      disabled={!newMarkerLabel.trim()} className="w-full px-2 py-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-xs rounded">Add Marker</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {hasLinks && (
            <button
              onClick={() => setShowLinks(!showLinks)}
              className={`text-xs px-2 py-1 rounded border transition-colors ${showLinks ? "border-accent text-accent bg-accent-light" : "border-border text-text-tertiary"}`}
            >
              Dependencies
            </button>
          )}
          <div className="flex items-center gap-1">
            <button onClick={() => setZoomIdx(Math.max(0, zoomIdx - 1))} disabled={zoomIdx === 0}
              className="p-1.5 rounded hover:bg-content-bg disabled:opacity-30 transition-colors">
              <ZoomOut className="w-4 h-4 text-text-secondary" />
            </button>
            <span className="text-xs text-text-tertiary w-8 text-center">
              {Math.round((ZOOM_LEVELS[zoomIdx] / ZOOM_LEVELS[1]) * 100)}%
            </span>
            <button onClick={() => setZoomIdx(Math.min(ZOOM_LEVELS.length - 1, zoomIdx + 1))} disabled={zoomIdx === ZOOM_LEVELS.length - 1}
              className="p-1.5 rounded hover:bg-content-bg disabled:opacity-30 transition-colors">
              <ZoomIn className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="flex min-h-full">
          {/* Left panel: item names */}
          <div className="w-64 shrink-0 border-r border-border bg-surface sticky left-0 z-10 min-h-full">
            <div className="h-10 border-b border-border" />
            <div className="h-8 border-b border-border flex items-center justify-end gap-0.5 px-2">

              <button
                onClick={collapseOneLevel}
                disabled={currentExpandDepth() < 0}
                className="p-0.5 rounded hover:bg-content-bg disabled:opacity-20 transition-colors"
                title="Collapse one level"
              >
                <Minus className="w-3.5 h-3.5 text-text-secondary" />
              </button>
              <button
                onClick={expandOneLevel}
                disabled={currentExpandDepth() >= maxDepth}
                className="p-0.5 rounded hover:bg-content-bg disabled:opacity-20 transition-colors"
                title="Expand one level"
              >
                <Plus className="w-3.5 h-3.5 text-text-secondary" />
              </button>
            </div>
            {/* Label row spacer — matches the right panel's milestone/today label row */}
            <div className="h-5 border-b border-border/30" />
            {rows.map((row) => {
              const { item, depth } = row;
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expanded.has(item.id);
              const bar = getBar(row);
              const hasError = bar?.error;
              return (
                <div
                  key={item.id}
                  className="h-10 flex items-center border-b border-border/50 hover:bg-content-bg transition-colors cursor-pointer"
                  style={{ paddingLeft: `${12 + depth * 16}px` }}
                  onClick={() => hasChildren && toggleExpand(item.id)}
                >
                  {hasChildren ? (
                    isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-text-tertiary mr-1.5 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-text-tertiary mr-1.5 shrink-0" />
                    )
                  ) : (
                    <span className="w-3.5 mr-1.5 shrink-0" />
                  )}
                  <StateIcon state={item.state} size={14} />
                  <span className="text-xs text-text-primary truncate ml-1.5">{item.title}</span>
                  {hasError && <AlertTriangle className="w-3 h-3 text-red-500 ml-1 shrink-0" />}
                  <span className="text-[10px] text-text-tertiary ml-auto mr-2 shrink-0">#{item.id}</span>
                </div>
              );
            })}
          </div>

          {/* Right panel: timeline */}
          <div style={{ width: totalWidth }}>
            {/* === Header rows === */}
            <div className="h-10 flex border-b border-border relative">
              {sprints.map((sprint, i) => (
                <div key={sprint.name} className="absolute top-0 h-full flex items-center justify-center border-r border-border/30"
                  style={{ left: sprint.startWeek * weekWidth, width: sprint.durationWeeks * weekWidth }}>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${i < 2 ? "bg-emerald-100 text-emerald-700" : i < 3 ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"}`}>
                    {sprint.name}
                  </span>
                </div>
              ))}
            </div>
            <div className="h-8 flex border-b border-border">
              {Array.from({ length: TOTAL_WEEKS }).map((_, i) => (
                <div key={i} className="border-r border-border/30 flex items-center justify-center" style={{ width: weekWidth }}>
                  <span className="text-[10px] text-text-tertiary">{weekLabel(i)}</span>
                </div>
              ))}
            </div>
            {/* Label row for milestones + today */}
            <div className="h-5 relative border-b border-border/30">
              {showToday && (
                <div className="absolute top-0 h-full flex items-center" style={{ left: todayOffset * weekWidth }}>
                  <span className="text-[9px] font-semibold whitespace-nowrap -translate-x-1/2 px-1 text-red-500">Today</span>
                </div>
              )}
              {hasMarkers && markerList.map(m => (
                <div key={m.label} className="absolute top-0 h-full flex items-center" style={{ left: m.week * weekWidth }}>
                  <span className="text-[9px] font-semibold whitespace-nowrap -translate-x-1/2 px-1" style={{ color: m.color }}>{m.label}</span>
                </div>
              ))}
            </div>

            {/* === Body: bars + overlays (all positioned relative to this div) === */}
            <div className="relative min-h-[calc(100vh-200px)]">
              {/* Grid lines, today, milestones — all cover the full body */}
              <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: TOTAL_WEEKS }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-r border-border/20"
                  style={{ left: i * weekWidth }}
                />
              ))}
              {showToday && <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500"
                style={{ left: todayOffset * weekWidth }}
              />}

              {/* Milestone marker lines (labels are in the dedicated row above) */}
              {hasMarkers && markerList.map(m => (
                <div key={m.label} className="absolute top-0 bottom-0 w-0.5 border-l-2 border-dashed" style={{ left: m.week * weekWidth, borderColor: m.color, opacity: 0.5 }} />
              ))}
            </div>

            {/* Timeline bars */}
            {rows.map((row) => {
              const { item } = row;
              const bar = getBar(row);
              if (!bar) {
                // Unplaceable story
                return (
                  <div key={item.id} className="h-10 relative border-b border-border/20">
                    {advanced && item.type === "story" && (
                      <div className="absolute top-3 left-4 flex items-center gap-1 text-[10px] text-text-tertiary italic">
                        <span className="text-red-400">—</span> No sprint or parent
                      </div>
                    )}
                  </div>
                );
              }

              // Compute retrospective bars from history
              const hist = advanced && item.history ? item.history : null;
              const activeAt = hist?.find(h => h.toState === "active")?.atWeek;
              const inProgressAt = hist?.find(h => h.toState === "in_progress")?.atWeek;
              const doneAt = hist?.find(h => h.toState === "done")?.atWeek;
              // Lead time bar: active → in_progress (the wait before work started)
              const leadStart = activeAt;
              const leadEnd = inProgressAt ?? doneAt ?? todayOffset;
              // Cycle time bar: in_progress → done (or now if still in progress)
              const cycleStart = inProgressAt;
              const cycleEnd = doneAt ?? todayOffset;

              return (
                <div key={item.id} className="h-10 relative border-b border-border/20">
                  {/* Error connector: red dotted line from feature end to sprint start */}
                  {bar.error?.type === "overflow" && (
                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
                      <line
                        x1={bar.error.featureEnd * weekWidth}
                        y1={20}
                        x2={bar.error.sprintStart * weekWidth}
                        y2={20}
                        stroke="#EF4444"
                        strokeWidth={2}
                        strokeDasharray="4 3"
                      />
                      <polygon
                        points={`${bar.error.sprintStart * weekWidth},16 ${bar.error.sprintStart * weekWidth},24 ${bar.error.sprintStart * weekWidth - 6},20`}
                        fill="#EF4444"
                      />
                    </svg>
                  )}

                  {/* Retrospective: lead time bar (faded) — active to done */}
                  {leadStart != null && leadEnd != null && (
                    <div
                      onClick={() => setSelectedId(item.id)}
                      className="absolute top-2 h-6 rounded bg-emerald-300/30 border border-emerald-400/40 cursor-pointer"
                      style={{
                        left: leadStart * weekWidth + 2,
                        width: Math.max((leadEnd - leadStart) * weekWidth - 4, 4),
                      }}
                    />
                  )}

                  {/* Retrospective: cycle time bar (solid) — in_progress to done */}
                  {cycleStart != null && cycleEnd != null && (
                    <div
                      onClick={() => setSelectedId(item.id)}
                      className="absolute top-2 h-6 rounded bg-emerald-500/70 cursor-pointer hover:ring-2 hover:ring-emerald-400/40"
                      style={{
                        left: cycleStart * weekWidth + 2,
                        width: Math.max((cycleEnd - cycleStart) * weekWidth - 4, 4),
                      }}
                    />
                  )}

                  {/* The planned bar — only shown when no actual history exists */}
                  {!hist && (() => {
                    const canDrag = hasDrag && item.state !== "done" && (item.type === "epic" || item.type === "feature");
                    return (
                      <div
                        onClick={() => setSelectedId(item.id)}
                        className={`absolute top-2 h-6 rounded hover:ring-2 hover:ring-white/40 ${typeColors[item.type]} ${stateOpacity[item.state] ?? "opacity-60"} transition-all group/bar ${
                          bar.error ? "ring-2 ring-red-400 ring-offset-1" : ""
                        } ${canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
                        style={{
                          left: bar.startWeek * weekWidth + 2,
                          width: Math.max(bar.durationWeeks * weekWidth - 4, 12),
                        }}
                      >
                        {bar.durationWeeks * weekWidth > 60 && (
                          <span className="absolute inset-0 flex items-center px-2 text-white text-[10px] font-medium truncate">
                            {item.title}
                          </span>
                        )}
                        {/* Drag handles */}
                        {canDrag && (
                          <>
                            <div className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover/bar:opacity-100 bg-white/30 rounded-l transition-opacity" title="Drag to change start date" />
                            <div className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover/bar:opacity-100 bg-white/30 rounded-r transition-opacity" title="Drag to change end date" />
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {/* Label on retrospective bar if it has history */}
                  {hist && cycleStart != null && (
                    <span
                      className="absolute top-3 text-[10px] font-medium text-emerald-900 truncate pointer-events-none"
                      style={{
                        left: (cycleStart * weekWidth) + 6,
                        maxWidth: ((cycleEnd ?? todayOffset) - cycleStart) * weekWidth - 12,
                      }}
                    >
                      {item.title}
                    </span>
                  )}
                </div>
              );
            })}
            {/* Dependency arrows overlay */}
            {hasLinks && showLinks && (
              <svg className="absolute top-0 left-0 pointer-events-none" style={{ width: totalWidth, height: rows.length * 40 }} overflow="visible">
                {links.filter(l => l.type === "blocks").map(link => {
                  const sourceRow = rows.findIndex(r => r.item.id === link.sourceId);
                  const targetRow = rows.findIndex(r => r.item.id === link.targetId);
                  if (sourceRow === -1 || targetRow === -1) return null;
                  const sourceBar = getBar(rows[sourceRow]);
                  const targetBar = getBar(rows[targetRow]);
                  if (!sourceBar || !targetBar) return null;

                  const sourceEndX = (sourceBar.startWeek + sourceBar.durationWeeks) * weekWidth;
                  const targetStartX = targetBar.startWeek * weekWidth;
                  const sourceY = sourceRow * 40 + 20;
                  const targetY = targetRow * 40 + 20;
                  const isConflict = targetBar.startWeek < sourceBar.startWeek + sourceBar.durationWeeks;
                  const color = isConflict ? "#EF4444" : "#6366F1";

                  // Arrow always arrives at target from the left, pointing into the bar
                  const arrowTip = targetStartX;
                  const arrowBase = targetStartX - 8;
                  const gap = targetStartX - sourceEndX;
                  let path: string;

                  if (gap > 20) {
                    // Normal: smooth bezier with midpoint control
                    const midX = (sourceEndX + arrowBase) / 2;
                    path = `M ${sourceEndX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${arrowBase} ${targetY}`;
                  } else {
                    // Same-X or conflict: S-curve that swings right then approaches from left
                    const swingOut = Math.max(40, Math.abs(gap) + 40);
                    path = `M ${sourceEndX} ${sourceY} C ${sourceEndX + swingOut} ${sourceY}, ${arrowBase - swingOut} ${targetY}, ${arrowBase} ${targetY}`;
                  }

                  return (
                    <g key={`${link.sourceId}-${link.targetId}`}>
                      <path d={path} fill="none" stroke={color} strokeWidth={2}
                        strokeDasharray={isConflict ? "4 3" : "none"} opacity={0.7} strokeLinejoin="round" />
                      <polygon
                        points={`${arrowBase},${targetY - 4} ${arrowBase},${targetY + 4} ${arrowTip},${targetY}`}
                        fill={color} opacity={0.7}
                      />
                    </g>
                  );
                })}
              </svg>
            )}
            </div>{/* end body */}
          </div>{/* end right panel */}
        </div>
      </div>

      {(() => {
        const sel = selectedId ? rows.find(r => r.item.id === selectedId) : null;
        return sel ? (
          <MockDetailPanel
            itemId={sel.item.id}
            title={sel.item.title}
            type={sel.item.type}
            state={sel.item.state}
            onClose={() => setSelectedId(null)}
          />
        ) : null;
      })()}
    </>
  );
}
