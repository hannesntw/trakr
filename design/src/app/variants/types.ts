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
  };
  tabs: Array<{ slug: string; label: string }>;
}
