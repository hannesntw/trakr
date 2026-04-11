"use client";

import { Circle, CircleDot, CircleCheck, Play, Globe, Terminal, Cpu } from "lucide-react";

interface StatusChange {
  id: number;
  fromState: string;
  toState: string;
  changedAt: string;
}

const stateLabels: Record<string, string> = { new: "New", active: "Active", ready: "Ready", in_progress: "In Progress", done: "Done" };
const stateColors: Record<string, string> = { new: "bg-gray-100 border-gray-300", active: "bg-blue-50 border-blue-300", ready: "bg-amber-50 border-amber-300", in_progress: "bg-indigo-50 border-indigo-300", done: "bg-emerald-50 border-emerald-300" };

function StateIcon({ state, size = 18 }: { state: string; size?: number }) {
  const map: Record<string, { icon: typeof Circle; color: string }> = {
    new: { icon: Circle, color: "text-gray-400" },
    active: { icon: CircleDot, color: "text-blue-500" },
    ready: { icon: CircleDot, color: "text-amber-500" },
    in_progress: { icon: Play, color: "text-indigo-500" },
    done: { icon: CircleCheck, color: "text-emerald-500" },
  };
  const cfg = map[state] ?? map.new;
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

export function StatusTimeline({ changes }: { changes: StatusChange[] }) {
  if (changes.length === 0) return null;

  // Compute durations between changes
  const durations = changes.map((c, i) => {
    if (i === 0) return null;
    const prev = new Date(changes[i - 1].changedAt).getTime();
    const curr = new Date(c.changedAt).getTime();
    return curr - prev;
  });

  // Stats
  const totalChanges = changes.length;
  const regressions = changes.filter((c, i) => {
    const stateOrder = ["new", "active", "ready", "in_progress", "done"];
    return stateOrder.indexOf(c.toState) < stateOrder.indexOf(c.fromState);
  }).length;

  const firstActive = changes.find(c => c.toState === "active" || c.toState === "in_progress");
  const lastDone = [...changes].reverse().find(c => c.toState === "done");
  const leadTimeMs = firstActive && lastDone ? new Date(lastDone.changedAt).getTime() - new Date(firstActive.changedAt).getTime() : null;

  // Cycle time: sum of time in in_progress
  let cycleTimeMs = 0;
  for (let i = 0; i < changes.length; i++) {
    if (changes[i].toState === "in_progress") {
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
            const isRegression = i < changes.length - 1 && (() => {
              const order = ["new", "active", "ready", "in_progress", "done"];
              return order.indexOf(changes[i + 1].toState) < order.indexOf(change.toState);
            })();
            return (
              <div key={`icon-${i}`} className="contents">
                <div className="flex justify-center">
                  <div className={`w-9 h-9 rounded-full border-2 ${stateColors[change.toState] ?? stateColors.new} flex items-center justify-center`}>
                    <StateIcon state={change.toState} />
                  </div>
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
                  <p className="text-[11px] font-medium text-text-primary">{stateLabels[change.toState] ?? change.toState}</p>
                  <p className="text-[10px] text-text-tertiary">{formatTime(change.changedAt)}</p>
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
