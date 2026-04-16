"use client";

import { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORK_ITEM_TYPES, TYPE_LABELS, TYPE_DOT_COLORS, TYPE_COLORS } from "@/lib/constants";
import { Combobox, type ComboboxOption } from "@/components/Combobox";
import type { WorkItemType } from "@/lib/constants";

interface WorkItem {
  id: string;
  displayId: string | null;
  title: string;
  type: string;
}

interface Sprint {
  id: string;
  name: string;
  state: string;
}

interface CreatedItem {
  id: string;
  displayId: string | null;
  type: string;
}

interface CreateWorkItemDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectKey: string;
  onCreated: () => void;
  defaultParentId?: number | null;
  defaultType?: "epic" | "feature" | "story" | "bug" | "task" | "idea";
}

export function CreateWorkItemDialog({
  open,
  onClose,
  projectId,
  projectKey,
  onCreated,
  defaultParentId,
  defaultType,
}: CreateWorkItemDialogProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"epic" | "feature" | "story" | "bug" | "task" | "idea">(
    defaultType ?? "story"
  );
  const [parentId, setParentId] = useState<number | "">(
    defaultParentId ?? ""
  );
  const [sprintId, setSprintId] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [parents, setParents] = useState<WorkItem[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [toast, setToast] = useState<CreatedItem | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setType(defaultType ?? "story");
    setParentId(defaultParentId ?? "");
    setSprintId("");

    fetch(`/api/work-items?projectId=${projectId}`)
      .then((r) => r.json())
      .then((items: WorkItem[]) => {
        setParents(
          items.filter((i) => i.type === "epic" || i.type === "feature")
        );
      });
    fetch(`/api/sprints?projectId=${projectId}`)
      .then((r) => r.json())
      .then(setSprints);
  }, [open, projectId, defaultParentId, defaultType]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);

    const body: Record<string, unknown> = {
      projectId,
      title: title.trim(),
      type,
    };
    if (parentId) body.parentId = parentId;
    if (sprintId) body.sprintId = sprintId;

    const res = await fetch("/api/work-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const created = await res.json();
      setToast({ id: created.id, displayId: created.displayId, type: created.type });
      onCreated();
      onClose();
    }
    setSubmitting(false);
  }

  // Combobox options for parent
  const filteredParents = useMemo(
    () =>
      parents.filter((p) =>
        type === "story" || type === "task" || type === "bug"
          ? p.type === "feature"
          : type === "feature"
            ? p.type === "epic"
            : true
      ),
    [parents, type]
  );

  const parentOptions: ComboboxOption[] = useMemo(
    () =>
      filteredParents.map((p) => ({
        value: String(p.id),
        label: p.title,
        secondary: `${p.displayId ?? `#${p.id}`} · ${TYPE_LABELS[p.type as WorkItemType] ?? p.type}`,
        icon: (
          <span
            className={cn(
              "inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border",
              TYPE_COLORS[p.type as WorkItemType]
            )}
          >
            {TYPE_LABELS[p.type as WorkItemType] ?? p.type}
          </span>
        ),
      })),
    [filteredParents]
  );

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-surface border border-border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
            <span className={cn("w-2 h-2 rounded-full", TYPE_DOT_COLORS[toast.type as WorkItemType])} />
            <span className="text-sm text-text-primary">
              {TYPE_LABELS[toast.type as WorkItemType]} {toast.displayId ?? `#${toast.id}`} created
            </span>
            <a
              href={`/projects/${projectKey}/work-items/${toast.id}`}
              className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
            >
              View
            </a>
            <button
              onClick={() => setToast(null)}
              className="p-0.5 rounded hover:bg-content-bg transition-colors ml-1"
            >
              <X className="w-3.5 h-3.5 text-text-tertiary" />
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <div className="relative bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-text-primary">
                Create Work Item
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-content-bg transition-colors"
              >
                <X className="w-4 h-4 text-text-tertiary" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Type selector */}
              <div>
                <label className="text-xs font-medium text-text-tertiary block mb-1.5">
                  Type
                </label>
                <div className="flex gap-2">
                  {WORK_ITEM_TYPES.filter((t) => t !== "idea").map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors",
                        type === t
                          ? "border-accent bg-accent-light text-accent"
                          : "border-border bg-surface text-text-secondary hover:border-border-hover"
                      )}
                    >
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          TYPE_DOT_COLORS[t]
                        )}
                      />
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-medium text-text-tertiary block mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`New ${TYPE_LABELS[type].toLowerCase()} title...`}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>

              {/* Parent (for non-epics) */}
              {type !== "epic" && (
                <div>
                  <label className="text-xs font-medium text-text-tertiary block mb-1.5">
                    Parent
                  </label>
                  <Combobox
                    options={parentOptions}
                    value={parentId ? String(parentId) : null}
                    onChange={(val) => setParentId(val ? Number(val) : "")}
                    placeholder="None"
                    searchPlaceholder="Search by title..."
                    clearLabel="No parent"
                  />
                </div>
              )}

              {/* Sprint (for stories) */}
              {type === "story" && (
                <div>
                  <label className="text-xs font-medium text-text-tertiary block mb-1.5">
                    Sprint
                  </label>
                  <select
                    value={sprintId}
                    onChange={(e) =>
                      setSprintId(e.target.value ? Number(e.target.value) : "")
                    }
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  >
                    <option value="">Backlog (no sprint)</option>
                    {sprints
                      .filter((s) => s.state !== "closed")
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !title.trim()}
                  className="px-4 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
                >
                  {submitting ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
