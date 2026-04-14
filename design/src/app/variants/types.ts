export interface VariantConfig {
  id: string;
  label: string;
  features: {
    // All existing features (now all in production)
    sprintCapacity: boolean;
    velocityTracking: boolean;
    burndownChart: boolean;
    customFields: boolean;
    bulkOperations: boolean;
    timelinePlanning: boolean;
    advancedPlanning: boolean;
    collapsibleSidebar: boolean;
    storyTimeline: boolean;
    changeHistory: boolean;
    timelineMarkers: boolean;
    timelineLinks: boolean;
    timelineDrag: boolean;
    backlogFilters: boolean;
    queryPage: boolean;
    assigneeCombobox: boolean;
    workItemLinks: boolean;
    reparent: boolean;
    configurableWorkflow: boolean;
    storyPoints: boolean;
    // GitHub integration (new)
    githubLinks: boolean;
    githubCIStatus: boolean;
    githubAutoTransition: boolean;
    githubStatusChecks: boolean;
    // TraQL-powered board features
    swimlanes: boolean;
    cardRules: boolean;
    // Enterprise org management
    orgManagement: boolean;
    teamManagement: boolean;
    rbac: boolean;
    auditLog: boolean;
    sso: boolean;
    billing: boolean;
    // Platform super-admin
    superAdmin: boolean;
  };
  tabs: Array<{ slug: string; label: string }>;
}
