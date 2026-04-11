export const WORK_ITEM_TYPES = ["epic", "feature", "story"] as const;
export type WorkItemType = (typeof WORK_ITEM_TYPES)[number];

export const WORK_ITEM_STATES = [
  "new",
  "active",
  "ready",
  "in_progress",
  "done",
] as const;
export type WorkItemState = (typeof WORK_ITEM_STATES)[number];

export const SPRINT_STATES = ["planning", "active", "closed"] as const;
export type SprintState = (typeof SPRINT_STATES)[number];

export const TYPE_COLORS: Record<WorkItemType, string> = {
  epic: "text-purple-600 bg-purple-50 border-purple-200",
  feature: "text-blue-600 bg-blue-50 border-blue-200",
  story: "text-emerald-600 bg-emerald-50 border-emerald-200",
};

export const TYPE_DOT_COLORS: Record<WorkItemType, string> = {
  epic: "bg-purple-500",
  feature: "bg-blue-500",
  story: "bg-emerald-500",
};

export const STATE_COLORS: Record<WorkItemState, string> = {
  new: "text-gray-600 bg-gray-50 border-gray-200",
  active: "text-blue-600 bg-blue-50 border-blue-200",
  ready: "text-amber-600 bg-amber-50 border-amber-200",
  in_progress: "text-indigo-600 bg-indigo-50 border-indigo-200",
  done: "text-emerald-600 bg-emerald-50 border-emerald-200",
};

export const STATE_LABELS: Record<WorkItemState, string> = {
  new: "New",
  active: "Active",
  ready: "Ready",
  in_progress: "In Progress",
  done: "Done",
};

export const TYPE_LABELS: Record<WorkItemType, string> = {
  epic: "Epic",
  feature: "Feature",
  story: "Story",
};
