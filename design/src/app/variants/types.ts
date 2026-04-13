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
  };
  tabs: Array<{ slug: string; label: string }>;
}
