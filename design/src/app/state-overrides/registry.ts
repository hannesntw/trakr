export interface StateOverrideDefinition {
  key: string;
  label: string;
  states: string[];
  pages: string[];
}

export const stateOverrideRegistry: StateOverrideDefinition[] = [
  {
    key: "board",
    label: "Board Items",
    states: ["default", "empty", "loading"],
    pages: ["board"],
  },
  {
    key: "backlog",
    label: "Backlog",
    states: ["default", "empty"],
    pages: ["backlog"],
  },
  {
    key: "sprintList",
    label: "Sprint List",
    states: ["default", "empty", "loading"],
    pages: ["sprints"],
  },
  {
    key: "timeline",
    label: "Timeline",
    states: ["default", "empty"],
    pages: ["timeline"],
  },
];

export function getRelevantOverrides(pathname: string): StateOverrideDefinition[] {
  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  return stateOverrideRegistry.filter((def) => def.pages.includes(lastSegment));
}
