export const WORK_ITEM_TYPES = ["epic", "feature", "story", "bug", "task"] as const;
export type WorkItemType = (typeof WORK_ITEM_TYPES)[number];

export const SPRINT_STATES = ["planning", "active", "closed"] as const;
export type SprintState = (typeof SPRINT_STATES)[number];

/** Shape returned by GET /api/projects/:id/workflow */
export interface WorkflowState {
  id: number;
  slug: string;
  displayName: string;
  position: number;
  category: "todo" | "in_progress" | "done";
  color: string;
}

export const TYPE_COLORS: Record<WorkItemType, string> = {
  epic: "text-purple-600 bg-purple-50 border-purple-200",
  feature: "text-blue-600 bg-blue-50 border-blue-200",
  story: "text-emerald-600 bg-emerald-50 border-emerald-200",
  bug: "text-red-600 bg-red-50 border-red-200",
  task: "text-slate-600 bg-slate-50 border-slate-200",
};

export const TYPE_DOT_COLORS: Record<WorkItemType, string> = {
  epic: "bg-purple-500",
  feature: "bg-blue-500",
  story: "bg-emerald-500",
  bug: "bg-red-500",
  task: "bg-slate-400",
};


export const TYPE_LABELS: Record<WorkItemType, string> = {
  epic: "Epic",
  feature: "Feature",
  story: "Story",
  bug: "Bug",
  task: "Task",
};
