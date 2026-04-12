"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { DetailPanel } from "@/components/DetailPanel";
import type { WorkflowState } from "@/lib/constants";
import { ZoomIn, ZoomOut, ChevronRight, ChevronDown, Plus, Minus, AlertTriangle, Circle, CircleDot, CircleCheck, Play } from "lucide-react";

// --- Types ---

interface WorkItem {
  id: number;
  title: string;
  type: string;
  state: string;
  parentId: number | null;
  sprintId: number | null;
  children?: WorkItem[];
}

interface Sprint {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  state: string;
}

interface StatusTransition {
  toState: string;
  changedAt: string;
}

interface TreeNode {
  item: WorkItem;
  depth: number;
  parentFeature: WorkItem | null;
}

// --- Constants ---

const ZOOM_LEVELS = [60, 80, 110, 150];
const TOTAL_WEEKS = 16;
const BASE_DATE = new Date("2026-03-30");

const typeColors: Record<string, string> = { epic: "bg-purple-500", feature: "bg-blue-500", story: "bg-emerald-500" };
const categoryOpacity: Record<string, string> = { done: "opacity-40", in_progress: "opacity-100", todo: "opacity-60" };

function weekFromDate(dateStr: string): number {
  return (new Date(dateStr).getTime() - BASE_DATE.getTime()) / (7 * 24 * 60 * 60 * 1000);
}

function weekLabel(weekOffset: number): string {
  const d = new Date(BASE_DATE);
  d.setDate(d.getDate() + weekOffset * 7);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// --- State Icon ---

const CATEGORY_ICON_MAP: Record<string, { icon: typeof Circle; color: string }> = {
  todo: { icon: Circle, color: "text-gray-400" },
  in_progress: { icon: Play, color: "text-indigo-500" },
  done: { icon: CircleCheck, color: "text-emerald-500" },
};

function StateIcon({ state, workflowStates }: { state: string; workflowStates?: WorkflowState[] }) {
  const ws = workflowStates?.find((w) => w.slug === state);
  const category = ws?.category ?? "todo";
  const cfg = CATEGORY_ICON_MAP[category] ?? CATEGORY_ICON_MAP.todo;
  const Icon = cfg.icon;
  return <Icon className={`w-3.5 h-3.5 ${cfg.color} shrink-0`} />;
}

// --- Component ---

interface TimelineClientProps {
  projectId: number;
  projectKey: string;
  projectName: string;
}

export function TimelineClient({ projectId, projectKey, projectName }: TimelineClientProps) {
  const [hierarchy, setHierarchy] = useState<WorkItem[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [historyMap, setHistoryMap] = useState<Map<number, StatusTransition[]>>(new Map());
  const [workflowStates, setWorkflowStates] = useState<WorkflowState[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [zoomIdx, setZoomIdx] = useState(1);

  const todayOffset = weekFromDate(new Date().toISOString());
  const weekWidth = ZOOM_LEVELS[zoomIdx];
  const totalWidth = TOTAL_WEEKS * weekWidth;

  const fetchData = useCallback(async () => {
    const [hierRes, sprintRes, wfRes] = await Promise.all([
      fetch(`/api/hierarchy?projectId=${projectId}`),
      fetch(`/api/sprints?projectId=${projectId}`),
      fetch(`/api/projects/${projectId}/workflow`),
    ]);
    const hier: WorkItem[] = await hierRes.json();
    const sprintData: Sprint[] = await sprintRes.json();
    setHierarchy(hier);
    setSprints(sprintData);
    if (wfRes.ok) setWorkflowStates(await wfRes.json());

    // Auto-expand epics
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const item of hier) next.add(item.id);
      return next;
    });

    // Fetch history for all items
    const allIds = collectIds(hier);
    const histEntries = await Promise.all(
      allIds.map(async (id) => {
        const res = await fetch(`/api/work-items/${id}/history`);
        const data: StatusTransition[] = await res.json();
        return [id, data] as const;
      })
    );
    setHistoryMap(new Map(histEntries));
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function collectIds(items: WorkItem[]): number[] {
    const ids: number[] = [];
    for (const item of items) {
      ids.push(item.id);
      if (item.children) ids.push(...collectIds(item.children));
    }
    return ids;
  }

  function toggleExpand(id: number) {
    setExpanded((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function flattenItems(items: WorkItem[], depth = 0, parentFeature: WorkItem | null = null): TreeNode[] {
    const result: TreeNode[] = [];
    for (const item of items) {
      result.push({ item, depth, parentFeature });
      if (item.children && expanded.has(item.id)) {
        const pf = item.type === "feature" ? item : parentFeature;
        result.push(...flattenItems(item.children, depth + 1, pf));
      }
    }
    return result;
  }

  // Expand/collapse all
  function collectExpandable(items: WorkItem[], depth = 0): Map<number, number[]> {
    const map = new Map<number, number[]>();
    for (const item of items) {
      if (item.children && item.children.length > 0) {
        map.set(depth, [...(map.get(depth) ?? []), item.id]);
        const childMap = collectExpandable(item.children, depth + 1);
        for (const [d, ids] of childMap) map.set(d, [...(map.get(d) ?? []), ...ids]);
      }
    }
    return map;
  }
  const depthMap = collectExpandable(hierarchy);
  const maxDepth = Math.max(...depthMap.keys(), 0);
  function currentExpandDepth(): number {
    for (let d = maxDepth; d >= 0; d--) { if ((depthMap.get(d) ?? []).some(id => expanded.has(id))) return d; }
    return -1;
  }
  function expandOneLevel() {
    const t = currentExpandDepth() + 1;
    if (t > maxDepth) return;
    setExpanded(prev => { const n = new Set(prev); for (const id of (depthMap.get(t) ?? [])) n.add(id); return n; });
  }
  function collapseOneLevel() {
    const d = currentExpandDepth();
    if (d < 0) return;
    setExpanded(prev => { const n = new Set(prev); for (const id of (depthMap.get(d) ?? [])) n.delete(id); return n; });
  }

  // Resolve bar position for a work item
  function getBar(node: TreeNode): { start: number; duration: number } | null {
    const { item, parentFeature } = node;
    // Epics/features: need start/end dates on the item — for now use sprint dates or spread
    if (item.type === "epic" || item.type === "feature") {
      // Find the earliest and latest sprint among children
      const childSprints = getChildSprintRange(item);
      if (childSprints) return childSprints;
      return null;
    }
    // Stories: derive from sprint
    if (item.sprintId) {
      const sprint = sprints.find(s => s.id === item.sprintId);
      if (sprint?.startDate) {
        const start = weekFromDate(sprint.startDate);
        const end = sprint.endDate ? weekFromDate(sprint.endDate) : start + 2;
        return { start, duration: end - start };
      }
    }
    // No sprint: spread across parent feature
    if (parentFeature) {
      const pBar = getBar({ item: parentFeature, depth: 0, parentFeature: null });
      if (pBar) {
        const siblings = parentFeature.children?.filter(c => c.type === "story" && !c.sprintId) ?? [];
        const idx = siblings.findIndex(s => s.id === item.id);
        const slice = pBar.duration / Math.max(siblings.length, 1);
        return { start: pBar.start + idx * slice, duration: slice };
      }
    }
    return null;
  }

  function getChildSprintRange(item: WorkItem): { start: number; duration: number } | null {
    const sprintIds = new Set<number>();
    function collect(wi: WorkItem) {
      if (wi.sprintId) sprintIds.add(wi.sprintId);
      wi.children?.forEach(collect);
    }
    collect(item);
    if (sprintIds.size === 0) return null;
    let minStart = Infinity, maxEnd = -Infinity;
    for (const sid of sprintIds) {
      const s = sprints.find(sp => sp.id === sid);
      if (s?.startDate) {
        const start = weekFromDate(s.startDate);
        const end = s.endDate ? weekFromDate(s.endDate) : start + 2;
        if (start < minStart) minStart = start;
        if (end > maxEnd) maxEnd = end;
      }
    }
    if (minStart === Infinity) return null;
    return { start: minStart, duration: maxEnd - minStart };
  }

  // Retrospective bars from history
  function getRetroBars(itemId: number) {
    const hist = historyMap.get(itemId);
    if (!hist || hist.length === 0) return null;
    const inProgressSlugs = new Set(workflowStates.filter(w => w.category === "in_progress").map(w => w.slug));
    const doneSlugs = new Set(workflowStates.filter(w => w.category === "done").map(w => w.slug));
    // "active" = first transition to any non-todo category
    const activeAt = hist.find(h => inProgressSlugs.has(h.toState) || doneSlugs.has(h.toState));
    const inProgressAt = hist.find(h => inProgressSlugs.has(h.toState));
    const doneAt = hist.find(h => doneSlugs.has(h.toState));
    return {
      leadStart: activeAt ? weekFromDate(activeAt.changedAt) : null,
      leadEnd: inProgressAt ? weekFromDate(inProgressAt.changedAt) : (doneAt ? weekFromDate(doneAt.changedAt) : null),
      cycleStart: inProgressAt ? weekFromDate(inProgressAt.changedAt) : null,
      cycleEnd: doneAt ? weekFromDate(doneAt.changedAt) : todayOffset,
    };
  }

  const rows = flattenItems(hierarchy);

  return (
    <>
      <Header
        title={projectName}
        subtitle="Timeline"
      />
      <div className="flex-1 overflow-auto">
        <div className="flex min-h-full">
          {/* Left panel */}
          <div className="w-64 shrink-0 border-r border-border bg-surface sticky left-0 z-10">
            <div className="h-10 border-b border-border flex items-center justify-between px-3">
              <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Items</span>
              <div className="flex gap-0.5">
                <button onClick={collapseOneLevel} disabled={currentExpandDepth() < 0} className="p-0.5 rounded hover:bg-content-bg disabled:opacity-20"><Minus className="w-3.5 h-3.5 text-text-secondary" /></button>
                <button onClick={expandOneLevel} disabled={currentExpandDepth() >= maxDepth} className="p-0.5 rounded hover:bg-content-bg disabled:opacity-20"><Plus className="w-3.5 h-3.5 text-text-secondary" /></button>
              </div>
            </div>
            <div className="h-8 border-b border-border flex items-center px-3">
              <div className="flex items-center gap-1">
                <button onClick={() => setZoomIdx(Math.max(0, zoomIdx - 1))} disabled={zoomIdx === 0} className="p-0.5 rounded hover:bg-content-bg disabled:opacity-20"><ZoomOut className="w-3 h-3 text-text-secondary" /></button>
                <span className="text-[10px] text-text-tertiary w-7 text-center">{Math.round((ZOOM_LEVELS[zoomIdx] / ZOOM_LEVELS[1]) * 100)}%</span>
                <button onClick={() => setZoomIdx(Math.min(ZOOM_LEVELS.length - 1, zoomIdx + 1))} disabled={zoomIdx === ZOOM_LEVELS.length - 1} className="p-0.5 rounded hover:bg-content-bg disabled:opacity-20"><ZoomIn className="w-3 h-3 text-text-secondary" /></button>
              </div>
            </div>
            {rows.map(({ item, depth }) => {
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expanded.has(item.id);
              return (
                <div
                  key={item.id}
                  className="h-10 flex items-center border-b border-border/50 hover:bg-content-bg transition-colors cursor-pointer"
                  style={{ paddingLeft: `${12 + depth * 16}px` }}
                  onClick={() => hasChildren && toggleExpand(item.id)}
                >
                  {hasChildren ? (isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-text-tertiary mr-1.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-text-tertiary mr-1.5 shrink-0" />) : <span className="w-3.5 mr-1.5 shrink-0" />}
                  <StateIcon state={item.state} workflowStates={workflowStates} />
                  <span className="text-xs text-text-primary truncate ml-1.5">{item.title}</span>
                  <span className="text-[10px] text-text-tertiary ml-auto mr-2 shrink-0">#{item.id}</span>
                </div>
              );
            })}
          </div>

          {/* Right panel */}
          <div style={{ width: totalWidth }} className="relative">
            {/* Sprint overlay */}
            <div className="h-10 flex border-b border-border relative">
              {sprints.filter(s => s.startDate).map((sprint, i) => {
                const start = weekFromDate(sprint.startDate!);
                const end = sprint.endDate ? weekFromDate(sprint.endDate) : start + 2;
                return (
                  <div key={sprint.id} className="absolute top-0 h-full flex items-center justify-center border-r border-border/30"
                    style={{ left: start * weekWidth, width: (end - start) * weekWidth }}>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sprint.state === "closed" ? "bg-emerald-100 text-emerald-700" : sprint.state === "active" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"}`}>
                      {sprint.name.replace(/^TRK |^PIC /, "")}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Week headers */}
            <div className="h-8 flex border-b border-border">
              {Array.from({ length: TOTAL_WEEKS }).map((_, i) => (
                <div key={i} className="border-r border-border/30 flex items-center justify-center" style={{ width: weekWidth }}>
                  <span className="text-[10px] text-text-tertiary">{weekLabel(i)}</span>
                </div>
              ))}
            </div>

            {/* Grid lines + today */}
            <div className="absolute top-[72px] left-0 right-0 bottom-0 pointer-events-none">
              {Array.from({ length: TOTAL_WEEKS }).map((_, i) => (
                <div key={i} className="absolute top-0 bottom-0 border-r border-border/20" style={{ left: i * weekWidth }} />
              ))}
              <div className="absolute top-0 bottom-0 w-0.5 bg-red-500" style={{ left: todayOffset * weekWidth }}>
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[9px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap">Today</div>
              </div>
            </div>

            {/* Bars */}
            {rows.map((node) => {
              const { item } = node;
              const bar = getBar(node);
              const retro = item.type === "story" ? getRetroBars(item.id) : null;
              const hasRetro = retro && (retro.leadStart != null || retro.cycleStart != null);

              if (!bar) {
                return (
                  <div key={item.id} className="h-10 relative border-b border-border/20">
                    {item.type === "story" && (
                      <div className="absolute top-3 left-4 text-[10px] text-text-tertiary italic">No sprint or parent</div>
                    )}
                  </div>
                );
              }

              return (
                <div key={item.id} className="h-10 relative border-b border-border/20">
                  {/* Retrospective bars (stories only) */}
                  {hasRetro && retro.leadStart != null && retro.leadEnd != null && (
                    <div onClick={() => setSelectedId(item.id)}
                      className="absolute top-2 h-6 rounded bg-emerald-300/30 border border-emerald-400/40 cursor-pointer"
                      style={{ left: retro.leadStart * weekWidth + 2, width: Math.max((retro.leadEnd - retro.leadStart) * weekWidth - 4, 4) }} />
                  )}
                  {hasRetro && retro.cycleStart != null && (
                    <div onClick={() => setSelectedId(item.id)}
                      className="absolute top-2 h-6 rounded bg-emerald-500/70 cursor-pointer hover:ring-2 hover:ring-emerald-400/40"
                      style={{ left: retro.cycleStart * weekWidth + 2, width: Math.max((retro.cycleEnd - retro.cycleStart) * weekWidth - 4, 4) }}>
                      {(retro.cycleEnd - retro.cycleStart) * weekWidth > 60 && (
                        <span className="absolute inset-0 flex items-center px-2 text-emerald-900 text-[10px] font-medium truncate">{item.title}</span>
                      )}
                    </div>
                  )}

                  {/* Planned bar (hidden for stories with retro data) */}
                  {!hasRetro && (
                    <div onClick={() => setSelectedId(item.id)}
                      className={`absolute top-2 h-6 rounded cursor-pointer hover:ring-2 hover:ring-white/40 ${typeColors[item.type] ?? "bg-gray-400"} ${categoryOpacity[workflowStates.find(w => w.slug === item.state)?.category ?? "todo"] ?? "opacity-60"} transition-all`}
                      style={{ left: bar.start * weekWidth + 2, width: Math.max(bar.duration * weekWidth - 4, 12) }}>
                      {bar.duration * weekWidth > 60 && (
                        <span className="absolute inset-0 flex items-center px-2 text-white text-[10px] font-medium truncate">{item.title}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <DetailPanel
        workItemId={selectedId}
        projectKey={projectKey}
        projectId={projectId}
        onClose={() => setSelectedId(null)}
        onUpdated={fetchData}
      />
    </>
  );
}
