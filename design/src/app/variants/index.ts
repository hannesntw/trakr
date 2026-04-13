import type { VariantConfig } from "./types";

/** All features that are already in production */
const prodFeatures = {
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
  timelineMarkers: true,
  timelineLinks: true,
  timelineDrag: true,
  backlogFilters: true,
  queryPage: true,
  assigneeCombobox: true,
  workItemLinks: true,
  reparent: true,
  configurableWorkflow: true,
  storyPoints: true,
};

const noGithub = {
  githubLinks: false,
  githubCIStatus: false,
  githubAutoTransition: false,
  createBranch: false,
};

const current: VariantConfig = {
  id: "current",
  label: "Current",
  features: {
    ...prodFeatures,
    ...noGithub,
  },
  tabs: [
    { slug: "board", label: "Board" },
    { slug: "backlog", label: "Backlog" },
    { slug: "queries", label: "Queries" },
    { slug: "sprints", label: "Sprints" },
    { slug: "timeline", label: "Timeline" },
  ],
};

const github: VariantConfig = {
  id: "github",
  label: "GitHub Integration",
  features: {
    ...prodFeatures,
    githubLinks: true,
    githubCIStatus: true,
    githubAutoTransition: true,
    createBranch: true,
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
    ...prodFeatures,
    ...noGithub,
    sprintCapacity: true,
    velocityTracking: true,
    burndownChart: true,
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
  github,
  reports,
};

export const variantIds = Object.keys(variants);
export const defaultVariant = "current";
