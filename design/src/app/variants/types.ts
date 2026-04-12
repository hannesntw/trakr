export interface VariantConfig {
  id: string;
  label: string;
  features: {
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
  };
  tabs: Array<{ slug: string; label: string }>;
}
