import type { VariantConfig } from "./types";

const noExtras = {
  backlogFilters: false,
  queryPage: false,
  assigneeCombobox: false,
  workItemLinks: false,
  reparent: false,
  configurableWorkflow: false,
  storyPoints: false,
};

const noTimeline = {
  timelineMarkers: false,
  timelineLinks: false,
  timelineDrag: false,
};

const current: VariantConfig = {
  id: "current",
  label: "Current",
  features: {
    sprintCapacity: false, velocityTracking: false, burndownChart: false,
    customFields: false, bulkOperations: false,
    timelinePlanning: true, advancedPlanning: true, collapsibleSidebar: true,
    storyTimeline: false, changeHistory: false,
    ...noTimeline,
    ...noExtras,
  },
  tabs: [
    { slug: "board", label: "Board" },
    { slug: "backlog", label: "Backlog" },
    { slug: "sprints", label: "Sprints" },
    { slug: "timeline", label: "Timeline" },
  ],
};

const timelineV2: VariantConfig = {
  id: "timeline-v2",
  label: "Timeline v2",
  features: {
    sprintCapacity: false, velocityTracking: false, burndownChart: false,
    customFields: false, bulkOperations: false,
    timelinePlanning: true, advancedPlanning: true, collapsibleSidebar: true,
    storyTimeline: false, changeHistory: false,
    timelineMarkers: true, timelineLinks: true, timelineDrag: true,
    ...noExtras,
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
    sprintCapacity: false, velocityTracking: false, burndownChart: false,
    customFields: false, bulkOperations: false,
    timelinePlanning: true, advancedPlanning: true, collapsibleSidebar: true,
    storyTimeline: true, changeHistory: true,
    ...noTimeline,
    backlogFilters: false, queryPage: false,
    workItemLinks: true, assigneeCombobox: true, reparent: true,
    configurableWorkflow: true, storyPoints: true,
  },
  tabs: [
    { slug: "board", label: "Board" },
    { slug: "backlog", label: "Backlog" },
    { slug: "sprints", label: "Sprints" },
    { slug: "timeline", label: "Timeline" },
  ],
};

const search: VariantConfig = {
  id: "search",
  label: "Search & Query",
  features: {
    sprintCapacity: false, velocityTracking: false, burndownChart: false,
    customFields: false, bulkOperations: false,
    timelinePlanning: true, advancedPlanning: true, collapsibleSidebar: true,
    storyTimeline: false, changeHistory: false,
    ...noTimeline,
    backlogFilters: true, queryPage: true,
    assigneeCombobox: false, workItemLinks: false, reparent: false,
  },
  tabs: [
    { slug: "board", label: "Board" },
    { slug: "backlog", label: "Backlog" },
    { slug: "queries", label: "Queries" },
    { slug: "sprints", label: "Sprints" },
    { slug: "timeline", label: "Timeline" },
  ],
};

const reports: VariantConfig = {
  id: "reports",
  label: "Reports",
  features: {
    sprintCapacity: true, velocityTracking: true, burndownChart: true,
    customFields: true, bulkOperations: true,
    timelinePlanning: true, advancedPlanning: true, collapsibleSidebar: true,
    storyTimeline: true, changeHistory: true,
    timelineMarkers: true, timelineLinks: true, timelineDrag: true,
    backlogFilters: true, queryPage: true,
    assigneeCombobox: true, workItemLinks: true, reparent: true,
    configurableWorkflow: true, storyPoints: true,
  },
  tabs: [
    { slug: "board", label: "Board" },
    { slug: "backlog", label: "Backlog" },
    { slug: "queries", label: "Queries" },
    { slug: "sprints", label: "Sprints" },
    { slug: "timeline", label: "Timeline" },
    { slug: "reports", label: "Reports" },
  ],
};

export const variants: Record<string, VariantConfig> = {
  current,
  "timeline-v2": timelineV2,
  detail,
  search,
  reports,
};

export const variantIds = Object.keys(variants);
export const defaultVariant = "current";
