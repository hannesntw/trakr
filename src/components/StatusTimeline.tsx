"use client";

import { Circle, CircleDot, CircleCheck, Play, Plus, Globe, Terminal, Cpu } from "lucide-react";
import { formatFullDateTime } from "@/lib/utils";
import type { WorkflowState } from "@/lib/constants";

interface StatusChange {
  id: number;
  fromState: string;
  toState: string;
  changedAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  todo: "bg-gray-100 border-gray-300",
  in_progress: "bg-indigo-50 border-indigo-300",
  done: "bg-emerald-50 border-emerald-300",
};

const CATEGORY_ICONS: Record<string, { icon: typeof Circle; color: string }> = {
  todo: { icon: Circle, color: "text-gray-400" },
  in_progress: { icon: Play, color: "text-indigo-500" },
  done: { icon: CircleCheck, color: "text-emerald-500" },
};

function StateIcon({ state, workflowStates, size = 18 }: { state: string; workflowStates?: WorkflowState[]; size?: number }) {
  const ws = workflowStates?.find((w) => w.slug === state);
  const category = ws?.category ?? "todo";
  const cfg = CATEGORY_ICONS[category] ?? CATEGORY_ICONS.todo;
  const Icon = cfg.icon;
  return <Icon style={{ width: size, height: size }} className={`${cfg.color} shrink-0`} />;
}

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function getStateLabel(state: string, workflowStates?: WorkflowState[]): string {
  const ws = workflowStates?.find((w) => w.slug === state);
  return ws?.displayName ?? state;
}

function getStateColor(state: string, workflowStates?: WorkflowState[]): string {
  const ws = workflowStates?.find((w) => w.slug === state);
  const category = ws?.category ?? "todo";
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.todo;
}

function getStatePosition(state: string, workflowStates?: WorkflowState[]): number {
  const ws = workflowStates?.find((w) => w.slug === state);
  return ws?.position ?? 0;
}

export function StatusTimeline({ changes, workflowStates }: { changes: StatusChange[]; workflowStates?: WorkflowState[] }) {
  if (changes.length === 0) return null;

  // Compute durations between changes
  const durations = changes.map((c, i) => {
    if (i === 0) return null;
    const prev = new Date(changes[i - 1].changedAt).getTime();
    const curr = new Date(c.changedAt).getTime();
    return curr - prev;
  });

  // Stats — exclude the initial creation entry from counts
  const isCreationEntry = (c: StatusChange) => c.fromState === "(created)";
  const totalChanges = changes.filter((c) => !isCreationEntry(c)).length;
  const regressions = changes.filter((c) => {
    if (isCreationEntry(c)) return false;
    return getStatePosition(c.toState, workflowStates) < getStatePosition(c.fromState, workflowStates);
  }).length;

  // Lead time: first non-todo to last done
  const firstActive = changes.find(c => {
    const ws = workflowStates?.find(w => w.slug === c.toState);
    return ws?.category === "in_progress";
  });
  const lastDone = [...changes].reverse().find(c => {
    const ws = workflowStates?.find(w => w.slug === c.toState);
    return ws?.category === "done";
  });
  const leadTimeMs = firstActive && lastDone ? new Date(lastDone.changedAt).getTime() - new Date(firstActive.changedAt).getTime() : null;

  // Cycle time: sum of time in in_progress category
  let cycleTimeMs = 0;
  for (let i = 0; i < changes.length; i++) {
    const ws = workflowStates?.find(w => w.slug === changes[i].toState);
    if (ws?.category === "in_progress") {
      const end = changes[i + 1] ? new Date(changes[i + 1].changedAt).getTime() : Date.now();
      cycleTimeMs += end - new Date(changes[i].changedAt).getTime();
    }
  }

  return (
    <div>
      <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">Status Timeline</h3>
      <div className="bg-surface border border-border rounded-lg p-5">
        <div
          className="grid items-center"
          style={{
            gridTemplateColumns: changes.map((_, i) =>
              i < changes.length - 1 ? "auto 1fr" : "auto"
            ).join(" "),
          }}
        >
          {/* Row 1: icons + connectors */}
          {changes.map((change, i) => {
            const isLast = i === changes.length - 1;
            const isRegression = i < changes.length - 1 && (
              getStatePosition(changes[i + 1].toState, workflowStates) < getStatePosition(change.toState, workflowStates)
            );
            return (
              <div key={`icon-${i}`} className="contents">
                <div className="flex justify-center">
                  {isCreationEntry(change) ? (
                    <div className="w-9 h-9 rounded-full border-2 bg-blue-50 border-blue-300 flex items-center justify-center">
                      <Plus style={{ width: 18, height: 18 }} className="text-blue-500 shrink-0" />
                    </div>
                  ) : (
                    <div className={`w-9 h-9 rounded-full border-2 ${getStateColor(change.toState, workflowStates)} flex items-center justify-center`}>
                      <StateIcon state={change.toState} workflowStates={workflowStates} />
                    </div>
                  )}
                </div>
                {!isLast && (
                  <div className="flex items-center px-1">
                    <div className={`h-0.5 flex-1 ${isRegression ? "bg-red-300" : "bg-border"}`} />
                  </div>
                )}
              </div>
            );
          })}
          {/* Row 2: labels */}
          {changes.map((change, i) => {
            const isLast = i === changes.length - 1;
            return (
              <div key={`label-${i}`} className="contents">
                <div className="text-center pt-2">
                  <p className="text-[11px] font-medium text-text-primary">
                    {isCreationEntry(change) ? "Created" : getStateLabel(change.toState, workflowStates)}
                  </p>
                  <p className="text-[10px] text-text-tertiary" title={formatFullDateTime(change.changedAt)}>{formatTime(change.changedAt)}</p>
                </div>
                {!isLast && (
                  <div className="text-center pt-2">
                    {durations[i + 1] != null && durations[i + 1]! > 0 && (
                      <p className="text-[9px] text-text-tertiary">{formatDuration(durations[i + 1]!)}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-6 mt-5 pt-4 border-t border-border">
          {leadTimeMs != null && (
            <div><p className="text-[10px] text-text-tertiary uppercase tracking-wider">Lead time</p><p className="text-sm font-semibold text-text-primary">{formatDuration(leadTimeMs)}</p></div>
          )}
          {cycleTimeMs > 0 && (
            <div><p className="text-[10px] text-text-tertiary uppercase tracking-wider">Cycle time</p><p className="text-sm font-semibold text-text-primary">{formatDuration(cycleTimeMs)}</p></div>
          )}
          {regressions > 0 && (
            <div><p className="text-[10px] text-text-tertiary uppercase tracking-wider">Regressions</p><p className="text-sm font-semibold text-red-500">{regressions}</p></div>
          )}
          <div><p className="text-[10px] text-text-tertiary uppercase tracking-wider">Changes</p><p className="text-sm font-semibold text-text-primary">{totalChanges}</p></div>
        </div>
      </div>
    </div>
  );
}
