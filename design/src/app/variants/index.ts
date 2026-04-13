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

const noOrg = {
  orgManagement: false,
  teamManagement: false,
  rbac: false,
  auditLog: false,
  sso: false,
  billing: false,
};

const noGithub = {
  githubLinks: false,
  githubCIStatus: false,
  githubAutoTransition: false,
  githubStatusChecks: false,
};

const noTraql = {
  swimlanes: false,
  cardRules: false,
};

const current: VariantConfig = {
  id: "current",
  label: "Current",
  features: {
    ...prodFeatures,
    ...noGithub,
    ...noTraql,
    ...noOrg,
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
    githubStatusChecks: true,
    swimlanes: true,
    cardRules: true,
    ...noOrg,
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
    ...noTraql,
    ...noOrg,
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

const enterprise: VariantConfig = {
  id: "enterprise",
  label: "Enterprise",
  features: {
    ...prodFeatures,
    githubLinks: true,
    githubCIStatus: true,
    githubAutoTransition: true,
    githubStatusChecks: true,
    swimlanes: true,
    cardRules: true,
    sprintCapacity: true,
    velocityTracking: true,
    burndownChart: true,
    orgManagement: true,
    teamManagement: true,
    rbac: true,
    auditLog: true,
    sso: true,
    billing: true,
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
  enterprise,
};

export const variantIds = Object.keys(variants);
export const defaultVariant = "current";
