"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, RotateCcw, Globe, Terminal, Cpu } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { WorkflowState } from "@/lib/constants";

interface Snapshot {
  id: number;
  workItemId: number;
  version: number;
  snapshot: Record<string, unknown>;
  changedBy: string | null;
  channel: string | null;
  createdAt: string;
}

interface FieldChange {
  field: string;
  old: unknown;
  new: unknown;
  isDiff: boolean; // true for long text fields
  diffLines?: Array<{ type: "context" | "added" | "removed"; line: string }>;
}

function getStateLabel(state: string, workflowStates?: WorkflowState[]): string {
  const ws = workflowStates?.find((w) => w.slug === state);
  return ws?.displayName ?? state;
}

function ChannelIcon({ channel }: { channel: string | null }) {
  const map: Record<string, { icon: typeof Globe; label: string; color: string }> = {
    web: { icon: Globe, label: "Web", color: "text-blue-500" },
    api: { icon: Terminal, label: "API", color: "text-amber-500" },
    mcp: { icon: Cpu, label: "MCP", color: "text-purple-500" },
  };
  const cfg = map[channel ?? "api"] ?? map.api;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${cfg.color}`}>
      <cfg.icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// Simple line diff: split by newline, compare
function computeLineDiff(oldText: string, newText: string): Array<{ type: "context" | "added" | "removed"; line: string }> {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: Array<{ type: "context" | "added" | "removed"; line: string }> = [];

  // Simple LCS-based diff
  const maxLen = Math.max(oldLines.length, newLines.length);
  let oi = 0, ni = 0;
  while (oi < oldLines.length || ni < newLines.length) {
    if (oi < oldLines.length && ni < newLines.length && oldLines[oi] === newLines[ni]) {
      result.push({ type: "context", line: oldLines[oi] });
      oi++; ni++;
    } else {
      // Look ahead for a match
      let foundOld = -1, foundNew = -1;
      for (let look = 1; look < 5; look++) {
        if (foundNew === -1 && ni + look < newLines.length && oldLines[oi] === newLines[ni + look]) foundNew = ni + look;
        if (foundOld === -1 && oi + look < oldLines.length && oldLines[oi + look] === newLines[ni]) foundOld = oi + look;
      }
      if (foundOld !== -1 && (foundNew === -1 || foundOld - oi <= foundNew - ni)) {
        while (oi < foundOld) { result.push({ type: "removed", line: oldLines[oi++] }); }
      } else if (foundNew !== -1) {
        while (ni < foundNew) { result.push({ type: "added", line: newLines[ni++] }); }
      } else {
        if (oi < oldLines.length) result.push({ type: "removed", line: oldLines[oi++] });
        if (ni < newLines.length) result.push({ type: "added", line: newLines[ni++] });
      }
    }
  }
  return result;
}

function diffSnapshots(prev: Record<string, unknown> | null, curr: Record<string, unknown>): FieldChange[] {
  const changes: FieldChange[] = [];
  const fields = ["title", "type", "state", "description", "assignee", "sprintId", "points", "priority", "parentId"];

  for (const field of fields) {
    const oldVal = prev?.[field] ?? null;
    const newVal = curr[field] ?? null;
    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;

    const isLongText = field === "description" && typeof oldVal === "string" && typeof newVal === "string" && ((oldVal as string).length > 80 || (newVal as string).length > 80);

    if (isLongText) {
      changes.push({
        field,
        old: oldVal,
        new: newVal,
        isDiff: true,
        diffLines: computeLineDiff(oldVal as string, newVal as string),
      });
    } else {
      changes.push({ field, old: oldVal, new: newVal, isDiff: false });
    }
  }
  return changes;
}

function formatFieldValue(field: string, value: unknown, workflowStates?: WorkflowState[]): string {
  if (value === null || value === undefined) return "—";
  if (field === "state") return getStateLabel(value as string, workflowStates);
  return String(value);
}

function isStateRegression(oldState: string, newState: string, workflowStates?: WorkflowState[]): boolean {
  if (!workflowStates) return false;
  const oldWs = workflowStates.find(w => w.slug === oldState);
  const newWs = workflowStates.find(w => w.slug === newState);
  if (!oldWs || !newWs) return false;
  return newWs.position < oldWs.position;
}

export function ChangeHistory({ versions, onRestore, workflowStates }: { versions: Snapshot[]; onRestore: (version: number) => void; workflowStates?: WorkflowState[] }) {
  const [open, setOpen] = useState(false);

  if (versions.length === 0) return null;

  // Compute diffs between consecutive versions
  const entries = versions.map((v, i) => ({
    ...v,
    changes: diffSnapshots(i > 0 ? versions[i - 1].snapshot : null, v.snapshot),
  })).reverse(); // newest first

  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3 hover:text-text-secondary transition-colors">
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        Change History
        <span className="font-normal normal-case">{versions.length} versions</span>
      </button>

      {open && (
        <div className="space-y-0">
          {entries.map((entry, i) => (
            <div key={entry.version} className="relative pl-8 pb-5 last:pb-0">
              {i < entries.length - 1 && <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />}
              <div className="absolute left-1 top-1 w-[14px] h-[14px] rounded-full bg-surface border-2 border-border" />

              <div className="bg-surface border border-border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-text-tertiary font-mono">v{entry.version}</span>
                  <span className="text-[10px] text-text-tertiary">{formatRelativeTime(entry.createdAt)}</span>
                  <span className="text-xs text-text-secondary">{entry.changedBy ?? "system"}</span>
                  <ChannelIcon channel={entry.channel} />
                  {entry.version > 0 && (
                    <button
                      onClick={() => { if (confirm(`Restore to version ${entry.version}?`)) onRestore(entry.version); }}
                      className="ml-auto flex items-center gap-1 text-[10px] text-text-tertiary hover:text-accent transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Restore
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {entry.changes.map((c, j) => (
                    <div key={j}>
                      {c.isDiff && c.diffLines ? (
                        <div>
                          <span className="text-xs text-text-tertiary font-mono">{c.field}:</span>
                          <div className="mt-1 rounded border border-border overflow-hidden text-[11px] font-mono leading-relaxed">
                            {c.diffLines.map((line, k) => (
                              <div key={k} className={
                                line.type === "added" ? "bg-emerald-50 text-emerald-800" :
                                line.type === "removed" ? "bg-red-50 text-red-800" :
                                "bg-surface text-text-secondary"
                              }>
                                <span className="inline-block w-5 text-center text-text-tertiary select-none">
                                  {line.type === "added" ? "+" : line.type === "removed" ? "−" : " "}
                                </span>
                                {line.line || "\u00A0"}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs font-mono">
                          <span className="text-text-tertiary">{c.field}:</span>
                          {c.old === null || c.old === undefined ? (
                            <span className="ml-2 text-emerald-600 bg-emerald-50 px-1 rounded">{formatFieldValue(c.field, c.new, workflowStates)}</span>
                          ) : (
                            <>
                              <span className="ml-2 line-through text-red-400 bg-red-50 px-1 rounded">{formatFieldValue(c.field, c.old, workflowStates)}</span>
                              <span className="mx-1 text-text-tertiary">→</span>
                              <span className="text-emerald-600 bg-emerald-50 px-1 rounded">{formatFieldValue(c.field, c.new, workflowStates)}</span>
                              {c.field === "state" && isStateRegression(c.old as string, c.new as string, workflowStates) && (
                                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded border border-red-200">regression</span>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {entry.changes.length === 0 && (
                    <p className="text-xs text-text-tertiary italic">No field changes (metadata only)</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
