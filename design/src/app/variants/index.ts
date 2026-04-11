import type { VariantConfig } from "./types";

const current: VariantConfig = {
  id: "current",
  label: "Current",
  features: {
    sprintCapacity: false,
    velocityTracking: false,
    burndownChart: false,
    customFields: false,
    bulkOperations: false,
    timelinePlanning: true,
    advancedPlanning: true,
    collapsibleSidebar: true,
    storyTimeline: false,
    changeHistory: false,
  },
  tabs: [
    { slug: "board", label: "Board" },
    { slug: "backlog", label: "Backlog" },
    { slug: "sprints", label: "Sprints" },
    { slug: "timeline", label: "Timeline" },
  ],
};

const sprintV2: VariantConfig = {
  id: "sprint-v2",
  label: "Sprint v2",
  features: {
    sprintCapacity: true,
    velocityTracking: true,
    burndownChart: false,
    customFields: false,
    bulkOperations: false,
    timelinePlanning: true,
    advancedPlanning: false,
    collapsibleSidebar: true,
    storyTimeline: false,
    changeHistory: false,
  },
  tabs: [
    { slug: "board", label: "Board" },
    { slug: "backlog", label: "Backlog" },
    { slug: "sprints", label: "Sprints" },
    { slug: "timeline", label: "Timeline" },
  ],
};

const detail: VariantConfig = {
  id: "detail",
  label: "Advanced Detail",
  features: {
    sprintCapacity: false,
    velocityTracking: false,
    burndownChart: false,
    customFields: false,
    bulkOperations: false,
    timelinePlanning: true,
    advancedPlanning: true,
    collapsibleSidebar: true,
    storyTimeline: true,
    changeHistory: true,
  },
  tabs: [
    { slug: "board", label: "Board" },
    { slug: "backlog", label: "Backlog" },
    { slug: "sprints", label: "Sprints" },
    { slug: "timeline", label: "Timeline" },
  ],
};

const reports: VariantConfig = {
  id: "reports",
  label: "Reports",
  features: {
    sprintCapacity: true,
    velocityTracking: true,
    burndownChart: true,
    customFields: true,
    bulkOperations: true,
    timelinePlanning: true,
    advancedPlanning: true,
    collapsibleSidebar: true,
    storyTimeline: true,
    changeHistory: true,
  },
  tabs: [
    { slug: "board", label: "Board" },
    { slug: "backlog", label: "Backlog" },
    { slug: "sprints", label: "Sprints" },
    { slug: "timeline", label: "Timeline" },
    { slug: "reports", label: "Reports" },
  ],
};

export const variants: Record<string, VariantConfig> = {
  current,
  "sprint-v2": sprintV2,
  detail,
  reports,
};

export const variantIds = Object.keys(variants);
export const defaultVariant = "current";
