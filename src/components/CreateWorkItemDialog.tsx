"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORK_ITEM_TYPES, TYPE_LABELS, TYPE_DOT_COLORS } from "@/lib/constants";

interface WorkItem {
  id: number;
  title: string;
  type: string;
}

interface Sprint {
  id: number;
  name: string;
  state: string;
}

interface CreateWorkItemDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
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
      onCreated();
      onClose();
    }
    setSubmitting(false);
  }

  if (!open) return null;

  return (
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
              {WORK_ITEM_TYPES.map((t) => (
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

          {/* Parent (for features and stories) */}
          {type !== "epic" && (
            <div>
              <label className="text-xs font-medium text-text-tertiary block mb-1.5">
                Parent
              </label>
              <select
                value={parentId}
                onChange={(e) =>
                  setParentId(e.target.value ? Number(e.target.value) : "")
                }
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              >
                <option value="">None</option>
                {parents
                  .filter((p) =>
                    type === "story"
                      ? p.type === "feature"
                      : p.type === "epic"
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.id} {p.title}
                    </option>
                  ))}
              </select>
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
  );
}
