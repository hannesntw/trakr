// TraQL — Trakr Query Language
// A complete query language for work items that can traverse
// the hierarchy, query sprint properties, aggregate results,
// and use date arithmetic.

// This file serves as the language reference for the click dummy.
// The actual parser would live in the Trakr backend.

export const traqlReference = {
  sections: [
    {
      title: "Field Queries",
      description: "Filter by any work item property.",
      examples: [
        { query: "type:story", note: "Stories only" },
        { query: "state:in_progress", note: "In-progress items" },
        { query: "assignee:Hannes", note: "Assigned to Hannes" },
        { query: 'title:~"sprint planning"', note: "Title contains text" },
        { query: "points:>=5", note: "5 or more story points" },
        { query: "priority:>2", note: "Priority above 2" },
        { query: "id:300..310", note: "ID range" },
      ],
    },
    {
      title: "Negation & Multi-value",
      description: "Exclude values or match any of several.",
      examples: [
        { query: "state:!done", note: "Not done" },
        { query: "type:story|bug", note: "Stories or bugs" },
        { query: "state:ready|in_progress", note: "Ready or in progress" },
      ],
    },
    {
      title: "Dates & Time",
      description: "Absolute dates, relative ranges, and functions.",
      examples: [
        { query: "created:>2026-01-01", note: "Created after date" },
        { query: "updated:last(7d)", note: "Updated in last 7 days" },
        { query: "updated:last(2w)", note: "Updated in last 2 weeks" },
        { query: "created:2026-01..2026-03", note: "Created in Q1" },
        { query: "created:within(sprint:active)", note: "Created during the active sprint" },
        { query: "end:<today()", note: "Past end date" },
      ],
    },
    {
      title: "Project Queries",
      description: "Query across projects or filter by project.",
      examples: [
        { query: "project:PIC", note: "Items in Pictura" },
        { query: "project:PIC|TRK", note: "Items in either project" },
        { query: "project:all", note: "All projects you have access to" },
        { query: "project:PIC type:story is:open", note: "Open Pictura stories" },
        { query: "SELECT count() GROUP BY project WHERE is:open", note: "Open items per project" },
      ],
    },
    {
      title: "Sprint Queries",
      description: "Filter by sprint assignment and properties.",
      examples: [
        { query: 'sprint:"Sprint 9"', note: "In a specific sprint" },
        { query: "sprint:active", note: "In the active sprint" },
        { query: "sprint:none", note: "Not in any sprint" },
        { query: "sprint.state:closed", note: "In a closed sprint" },
      ],
    },
    {
      title: "Hierarchy Traversal",
      description: "Query parent, children, ancestors, or descendants.",
      examples: [
        { query: "parent.type:epic", note: "Direct parent is an epic" },
        { query: "parent.state:active", note: "Parent is active" },
        { query: 'ancestor.title:~"Core"', note: "Any ancestor contains 'Core'" },
        { query: "children.state:all(done)", note: "All children are done" },
        { query: "children.state:any(in_progress)", note: "At least one child in progress" },
        { query: "children.type:has(bug)", note: "Has a bug child" },
        { query: "children.count:>3", note: "More than 3 children" },
        { query: "descendant.count:>10", note: "Total descendants > 10" },
      ],
    },
    {
      title: "Logic & Grouping",
      description: "Combine conditions with AND, OR, NOT, and parentheses.",
      examples: [
        { query: "type:story AND state:ready", note: "Both conditions" },
        { query: "type:story OR type:bug", note: "Either condition" },
        { query: "NOT state:done", note: "Negated condition" },
        { query: "(type:story OR type:bug) AND state:!done", note: "Grouped logic" },
      ],
    },
    {
      title: "Syntactic Sugar",
      description: "Shortcuts for common queries.",
      examples: [
        { query: "is:open", note: "→ state:!done" },
        { query: "is:closed", note: "→ state:done" },
        { query: "is:unassigned", note: "→ assignee:none" },
        { query: "is:overdue", note: "→ end:<today()" },
        { query: "is:stale", note: "→ updated:last(14d) AND state:!done" },
        { query: "my:items", note: "→ assignee:me" },
      ],
    },
    {
      title: "Sorting",
      description: "Order results by any field.",
      examples: [
        { query: "type:story ORDER BY created DESC", note: "Newest first" },
        { query: "is:open ORDER BY priority DESC, points", note: "By priority, then points" },
      ],
    },
    {
      title: "Aggregations",
      description: "Return counts, sums, or averages instead of work items.",
      examples: [
        { query: "SELECT count() WHERE type:story AND state:done", note: "→ 42" },
        { query: "SELECT sum(points) WHERE sprint:active", note: "→ 34" },
        { query: "SELECT avg(points) WHERE type:story", note: "→ 4.2" },
        { query: "SELECT count() GROUP BY state", note: "→ {new: 5, active: 3, ...}" },
        { query: "SELECT sum(points) GROUP BY assignee WHERE sprint:active", note: "→ {Hannes: 13, ...}" },
        { query: "SELECT count() GROUP BY parent.title WHERE type:story AND is:open", note: "Open stories per feature" },
      ],
    },
    {
      title: "Text Output",
      description: "Format results as text — build lists, links, or reports from query results.",
      examples: [
        { query: 'SELECT format("{title} (#{id})") WHERE sprint:active', note: "Title and ID per item" },
        { query: 'SELECT format("- [{title}]({url})") WHERE sprint:active', note: "Markdown link list" },
        { query: 'SELECT format("{title}: {points}pts") WHERE sprint:active ORDER BY points DESC', note: "Sorted text list" },
        { query: 'SELECT format("| {id} | {title} | {state} |") WHERE type:story is:open', note: "Markdown table rows" },
        { query: 'SELECT format("{assignee}: {title}") GROUP BY assignee WHERE sprint:active', note: "Grouped by person" },
        { query: 'SELECT format("{parent.title} → {title}") WHERE type:story state:in_progress', note: "Include parent fields" },
      ],
    },
  ],
};

// Quick-complete suggestions shown as user types
export const traqlSuggestions = {
  fields: ["type", "state", "assignee", "title", "description", "points", "priority", "id", "project", "created", "updated", "sprint", "parent", "children", "ancestor", "descendant"],
  types: ["epic", "feature", "story", "bug", "task"],
  states: ["new", "active", "ready", "in_progress", "done"],
  shortcuts: ["is:open", "is:closed", "is:unassigned", "is:overdue", "is:stale", "my:items", "my:created"],
  functions: ["today()", "now()", "last(7d)", "last(2w)", "last(3m)", "startOf(week)", "endOf(month)", "count()", "sum(points)", "avg(points)"],
  quantifiers: ["all()", "any()", "has()", "none()"],
  operators: ["AND", "OR", "NOT", "ORDER BY", "SELECT", "WHERE", "GROUP BY"],
};
