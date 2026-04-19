"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check, Terminal, Key, Lightbulb, Wrench } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Param {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface Tool {
  name: string;
  description: string;
  params: Param[];
  example: string;
  response: string;
}

interface ToolCategory {
  title: string;
  icon: string;
  tools: Tool[];
}

/* ------------------------------------------------------------------ */
/*  Tool data (derived from src/app/api/mcp/route.ts)                  */
/* ------------------------------------------------------------------ */

const categories: ToolCategory[] = [
  {
    title: "Account",
    icon: "user",
    tools: [
      {
        name: "whoami",
        description: "Get the current authenticated user and their org memberships",
        params: [],
        example: `// Who am I signed in as?\nawait mcp.whoami()`,
        response: `{
  "id": "8f142b70-9b86-422d-a1c3-61a4bb13ef5d",
  "name": "Hannes",
  "email": "hannes@stori.zone",
  "image": "https://...",
  "isPlatformAdmin": true,
  "orgs": [
    { "id": "wcex78bs0rphcf1foycarwko", "name": "Stori", "slug": "stori", "role": "owner" }
  ]
}`,
      },
    ],
  },
  {
    title: "Projects",
    icon: "folder",
    tools: [
      {
        name: "list_projects",
        description: "List all projects in Stori",
        params: [],
        example: `// List all projects\nawait mcp.list_projects()`,
        response: `[
  { "id": 1, "name": "Pictura", "key": "PIC", "description": "Photo sharing app" },
  { "id": 2, "name": "Stori", "key": "TRK", "description": "Project management tool" }
]`,
      },
      {
        name: "create_project",
        description: "Create a new project",
        params: [
          { name: "name", type: "string", required: true, description: "Project name" },
          { name: "key", type: "string", required: true, description: "2-5 char uppercase key, e.g. PIC" },
          { name: "description", type: "string", required: false, description: "Project description" },
        ],
        example: `// Create a new project\nawait mcp.create_project({\n  name: "Acme App",\n  key: "ACM",\n  description: "Acme Corp product"\n})`,
        response: `{ "id": 3, "name": "Acme App", "key": "ACM", "description": "Acme Corp product" }`,
      },
    ],
  },
  {
    title: "Work Items",
    icon: "layers",
    tools: [
      {
        name: "list_work_items",
        description: "List work items with optional filters",
        params: [
          { name: "projectId", type: "number", required: false, description: "Filter by project ID" },
          { name: "type", type: '"epic" | "feature" | "story" | "bug" | "task"', required: false, description: "Filter by work item type" },
          { name: "state", type: "string", required: false, description: "Workflow state slug" },
          { name: "sprintId", type: "number", required: false, description: "Filter by sprint ID" },
          { name: "parentId", type: "number", required: false, description: "Filter by parent work item ID" },
          { name: "query", type: "string", required: false, description: "Search title" },
        ],
        example: `// List open stories in project 1\nawait mcp.list_work_items({\n  projectId: 1,\n  type: "story",\n  state: "open"\n})`,
        response: `[
  { "id": 101, "title": "Add photo filters", "type": "story", "state": "in_progress", ... },
  { "id": 102, "title": "Share to feed", "type": "story", "state": "ready", ... }
]`,
      },
      {
        name: "get_work_item",
        description: "Get a single work item by ID (includes children)",
        params: [
          { name: "id", type: "number", required: true, description: "Work item ID" },
        ],
        example: `// Get work item with children\nawait mcp.get_work_item({ id: 101 })`,
        response: `{
  "id": 101, "title": "Add photo filters", "type": "story",
  "state": "in_progress", "points": 5, "assignee": "Hannes",
  "children": [ ... ]
}`,
      },
      {
        name: "create_work_item",
        description: "Create a new work item (epic, feature, or story)",
        params: [
          { name: "projectId", type: "number", required: true, description: "Project ID" },
          { name: "title", type: "string", required: true, description: "Work item title" },
          { name: "type", type: '"epic" | "feature" | "story" | "bug" | "task"', required: true, description: "Work item type" },
          { name: "description", type: "string", required: false, description: "Markdown description" },
          { name: "parentId", type: "number", required: false, description: "Parent work item ID" },
          { name: "sprintId", type: "number", required: false, description: "Sprint ID" },
          { name: "assignee", type: "string", required: false, description: "Assignee name" },
          { name: "state", type: "string", required: false, description: "Workflow state slug" },
          { name: "points", type: "number | null", required: false, description: "Story points (fibonacci: 1,2,3,5,8,13)" },
          { name: "priority", type: "number", required: false, description: "Priority level" },
        ],
        example: `// Create a story under a feature\nawait mcp.create_work_item({\n  projectId: 1,\n  title: "Implement dark mode",\n  type: "story",\n  parentId: 50,\n  points: 5,\n  description: "## Acceptance Criteria\\n- Toggle in settings\\n- Persists across sessions"\n})`,
        response: `{ "id": 201, "title": "Implement dark mode", "type": "story", "state": "new", ... }`,
      },
      {
        name: "update_work_item",
        description: "Update fields on a work item",
        params: [
          { name: "id", type: "number", required: true, description: "Work item ID" },
          { name: "title", type: "string", required: false, description: "New title" },
          { name: "type", type: '"epic" | "feature" | "story" | "bug" | "task"', required: false, description: "Change type" },
          { name: "state", type: "string", required: false, description: "Workflow state slug" },
          { name: "description", type: "string", required: false, description: "Markdown description" },
          { name: "parentId", type: "number | null", required: false, description: "Re-parent or unparent (null)" },
          { name: "sprintId", type: "number | null", required: false, description: "Move to sprint or remove (null)" },
          { name: "assignee", type: "string | null", required: false, description: "Reassign or unassign (null)" },
          { name: "points", type: "number | null", required: false, description: "Story points (fibonacci: 1,2,3,5,8,13)" },
          { name: "priority", type: "number", required: false, description: "Priority level" },
        ],
        example: `// Move a story to "in progress" and assign it\nawait mcp.update_work_item({\n  id: 201,\n  state: "in_progress",\n  assignee: "Hannes"\n})`,
        response: `{ "id": 201, "state": "in_progress", "assignee": "Hannes", ... }`,
      },
      {
        name: "delete_work_item",
        description: "Delete a work item",
        params: [
          { name: "id", type: "number", required: true, description: "Work item ID" },
        ],
        example: `// Delete a work item\nawait mcp.delete_work_item({ id: 201 })`,
        response: `{ "ok": true }`,
      },
      {
        name: "get_hierarchy",
        description: "Get the full epic > feature > story tree",
        params: [
          { name: "projectId", type: "number", required: false, description: "Scope to a project" },
          { name: "rootId", type: "number", required: false, description: "Start from a specific root item" },
        ],
        example: `// Get full hierarchy for project 1\nawait mcp.get_hierarchy({ projectId: 1 })`,
        response: `[
  {
    "id": 10, "title": "Core Features", "type": "epic",
    "children": [
      { "id": 50, "title": "Photo Upload", "type": "feature",
        "children": [
          { "id": 101, "title": "Camera capture", "type": "story", ... }
        ]
      }
    ]
  }
]`,
      },
    ],
  },
  {
    title: "Sprints",
    icon: "zap",
    tools: [
      {
        name: "list_sprints",
        description: "List sprints, optionally filtered by project or state",
        params: [
          { name: "projectId", type: "number", required: false, description: "Filter by project" },
          { name: "state", type: '"planning" | "active" | "closed"', required: false, description: "Filter by sprint state" },
        ],
        example: `// Get the active sprint\nawait mcp.list_sprints({\n  projectId: 1,\n  state: "active"\n})`,
        response: `[
  { "id": 5, "name": "Sprint 9", "state": "active",
    "startDate": "2026-03-30", "endDate": "2026-04-13" }
]`,
      },
      {
        name: "create_sprint",
        description: "Create a new sprint",
        params: [
          { name: "projectId", type: "number", required: true, description: "Project ID" },
          { name: "name", type: "string", required: true, description: "Sprint name" },
          { name: "goal", type: "string", required: false, description: "Sprint goal" },
          { name: "startDate", type: "string", required: false, description: "ISO date, e.g. 2026-04-14" },
          { name: "endDate", type: "string", required: false, description: "ISO date" },
        ],
        example: `// Create the next sprint\nawait mcp.create_sprint({\n  projectId: 1,\n  name: "Sprint 10",\n  goal: "Complete notifications MVP",\n  startDate: "2026-04-14",\n  endDate: "2026-04-27"\n})`,
        response: `{ "id": 6, "name": "Sprint 10", "state": "planning", ... }`,
      },
      {
        name: "update_sprint",
        description: "Update a sprint",
        params: [
          { name: "id", type: "number", required: true, description: "Sprint ID" },
          { name: "name", type: "string", required: false, description: "New name" },
          { name: "goal", type: "string | null", required: false, description: "Update or clear goal" },
          { name: "state", type: '"planning" | "active" | "closed"', required: false, description: "Change sprint state" },
          { name: "startDate", type: "string | null", required: false, description: "Update or clear start date" },
          { name: "endDate", type: "string | null", required: false, description: "Update or clear end date" },
        ],
        example: `// Activate a sprint\nawait mcp.update_sprint({\n  id: 6,\n  state: "active"\n})`,
        response: `{ "id": 6, "name": "Sprint 10", "state": "active", ... }`,
      },
    ],
  },
  {
    title: "Workflow",
    icon: "git-branch",
    tools: [
      {
        name: "get_workflow",
        description: "Get the workflow states for a project, ordered by position",
        params: [
          { name: "projectId", type: "number", required: true, description: "Project ID" },
        ],
        example: `// Get workflow for project 1\nawait mcp.get_workflow({ projectId: 1 })`,
        response: `[
  { "id": 1, "slug": "new", "displayName": "New", "category": "todo", "color": "#6B7280" },
  { "id": 2, "slug": "ready", "displayName": "Ready", "category": "todo", "color": "#3B82F6" },
  { "id": 3, "slug": "in_progress", "displayName": "In Progress", "category": "in_progress", "color": "#F59E0B" },
  { "id": 4, "slug": "done", "displayName": "Done", "category": "done", "color": "#10B981" }
]`,
      },
      {
        name: "add_workflow_state",
        description: "Add a new state to a project's workflow",
        params: [
          { name: "projectId", type: "number", required: true, description: "Project ID" },
          { name: "displayName", type: "string", required: true, description: "Display name for the state" },
          { name: "category", type: '"todo" | "in_progress" | "done"', required: true, description: "State category" },
          { name: "color", type: "string", required: false, description: "Hex color code" },
        ],
        example: `// Add a "QA Review" state\nawait mcp.add_workflow_state({\n  projectId: 1,\n  displayName: "QA Review",\n  category: "in_progress",\n  color: "#8B5CF6"\n})`,
        response: `{ "id": 5, "slug": "qa_review", "displayName": "QA Review", "category": "in_progress", "color": "#8B5CF6" }`,
      },
      {
        name: "update_workflow_state",
        description: "Update a workflow state (display name, category, or color -- slug is immutable)",
        params: [
          { name: "projectId", type: "number", required: true, description: "Project ID" },
          { name: "stateId", type: "number", required: true, description: "State ID" },
          { name: "displayName", type: "string", required: false, description: "New display name" },
          { name: "category", type: '"todo" | "in_progress" | "done"', required: false, description: "New category" },
          { name: "color", type: "string", required: false, description: "New hex color" },
        ],
        example: `// Rename a state\nawait mcp.update_workflow_state({\n  projectId: 1,\n  stateId: 3,\n  displayName: "Working On"\n})`,
        response: `{ "id": 3, "slug": "in_progress", "displayName": "Working On", "category": "in_progress" }`,
      },
      {
        name: "delete_workflow_state",
        description: "Delete a workflow state. Cannot delete the last state in a category. If items exist in this state, provide migrateToSlug.",
        params: [
          { name: "projectId", type: "number", required: true, description: "Project ID" },
          { name: "stateId", type: "number", required: true, description: "State ID to delete" },
          { name: "migrateToSlug", type: "string", required: false, description: "Slug of the state to migrate existing items to" },
        ],
        example: `// Delete a state and migrate items\nawait mcp.delete_workflow_state({\n  projectId: 1,\n  stateId: 5,\n  migrateToSlug: "in_progress"\n})`,
        response: `{ "ok": true, "migrated": 3 }`,
      },
    ],
  },
  {
    title: "TraQL",
    icon: "search",
    tools: [
      {
        name: "run_traql",
        description: 'Run a TraQL query. Returns work items, aggregates, or formatted text. Examples: \'type:story is:open\', \'SELECT count() GROUP BY state\', \'SELECT format("- {title}") WHERE sprint:active\'',
        params: [
          { name: "query", type: "string", required: true, description: "TraQL query string" },
          { name: "projectId", type: "number", required: false, description: "Scope to a project ID. Omit for cross-project queries using project: field." },
        ],
        example: `// Count open stories by assignee\nawait mcp.run_traql({\n  query: "SELECT count() GROUP BY assignee WHERE type:story is:open",\n  projectId: 1\n})`,
        response: `{ "results": { "Hannes": 5, "Lena": 3, "unassigned": 8 } }`,
      },
    ],
  },
  {
    title: "Links",
    icon: "link",
    tools: [
      {
        name: "list_links",
        description: "List all links for a work item",
        params: [
          { name: "workItemId", type: "number", required: true, description: "Work item ID" },
        ],
        example: `// Get links for item 101\nawait mcp.list_links({ workItemId: 101 })`,
        response: `[
  { "id": 1, "type": "blocks", "targetId": 102, "targetTitle": "Share to feed" },
  { "id": 2, "type": "relates_to", "targetId": 105, "targetTitle": "Feed redesign" }
]`,
      },
      {
        name: "create_link",
        description: "Create a link between two work items. Inverse link is created automatically.",
        params: [
          { name: "workItemId", type: "number", required: true, description: "Source work item ID" },
          { name: "targetId", type: "number", required: true, description: "Target work item ID" },
          { name: "type", type: '"blocks" | "blocked_by" | "relates_to" | "duplicates"', required: true, description: "Link type" },
        ],
        example: `// Item 101 blocks item 102\nawait mcp.create_link({\n  workItemId: 101,\n  targetId: 102,\n  type: "blocks"\n})`,
        response: `{ "id": 3, "type": "blocks", "workItemId": 101, "targetId": 102 }`,
      },
      {
        name: "delete_link",
        description: "Delete a work item link and its inverse",
        params: [
          { name: "workItemId", type: "number", required: true, description: "Source work item ID" },
          { name: "linkId", type: "number", required: true, description: "Link ID to delete" },
        ],
        example: `// Remove a link\nawait mcp.delete_link({ workItemId: 101, linkId: 3 })`,
        response: `{ "ok": true }`,
      },
    ],
  },
  {
    title: "Saved Queries",
    icon: "bookmark",
    tools: [
      {
        name: "list_saved_queries",
        description: "List saved TraQL queries for a project",
        params: [
          { name: "projectId", type: "number", required: true, description: "Project ID" },
        ],
        example: `// List saved queries\nawait mcp.list_saved_queries({ projectId: 1 })`,
        response: `[
  { "id": 1, "name": "Open bugs", "query": "type:bug is:open" },
  { "id": 2, "name": "Sprint burndown", "query": "SELECT sum(points) GROUP BY state WHERE sprint:active" }
]`,
      },
      {
        name: "save_query",
        description: "Save a TraQL query",
        params: [
          { name: "projectId", type: "number", required: true, description: "Project ID" },
          { name: "name", type: "string", required: true, description: "Query name" },
          { name: "query", type: "string", required: true, description: "TraQL query string" },
        ],
        example: `// Save a useful query\nawait mcp.save_query({\n  projectId: 1,\n  name: "Stale unassigned",\n  query: "is:stale is:unassigned"\n})`,
        response: `{ "id": 3, "name": "Stale unassigned", "query": "is:stale is:unassigned" }`,
      },
    ],
  },
  {
    title: "Attachments & History",
    icon: "paperclip",
    tools: [
      {
        name: "list_attachments",
        description: "List attachments for a work item",
        params: [
          { name: "workItemId", type: "number", required: true, description: "Work item ID" },
        ],
        example: `// List attachments\nawait mcp.list_attachments({ workItemId: 101 })`,
        response: `[
  { "id": 1, "filename": "screenshot.png", "contentType": "image/png", "url": "/api/attachments/1" }
]`,
      },
      {
        name: "upload_attachment",
        description: "Upload an image attachment to a work item. Provide base64-encoded file data.",
        params: [
          { name: "workItemId", type: "number", required: true, description: "Work item ID" },
          { name: "filename", type: "string", required: true, description: "Filename" },
          { name: "contentType", type: "string", required: true, description: "MIME type, e.g. image/png" },
          { name: "base64Data", type: "string", required: true, description: "Base64-encoded file content" },
        ],
        example: `// Upload a screenshot\nawait mcp.upload_attachment({\n  workItemId: 101,\n  filename: "modal.png",\n  contentType: "image/png",\n  base64Data: "iVBORw0KGgo..."\n})`,
        response: `{ "id": 2, "filename": "modal.png", "url": "/api/attachments/2" }`,
      },
      {
        name: "get_status_history",
        description: "Get the status change history for a work item (shows when it moved between states)",
        params: [
          { name: "workItemId", type: "number", required: true, description: "Work item ID" },
        ],
        example: `// See state transitions\nawait mcp.get_status_history({ workItemId: 101 })`,
        response: `[
  { "from": "new", "to": "ready", "changedAt": "2026-03-15T10:00:00Z" },
  { "from": "ready", "to": "in_progress", "changedAt": "2026-03-20T14:30:00Z" }
]`,
      },
      {
        name: "get_work_item_versions",
        description: "Get all snapshots/versions of a work item with full field history",
        params: [
          { name: "workItemId", type: "number", required: true, description: "Work item ID" },
        ],
        example: `// Get version history\nawait mcp.get_work_item_versions({ workItemId: 101 })`,
        response: `[
  { "version": 1, "title": "Add filters", "state": "new", "changedAt": "..." },
  { "version": 2, "title": "Add photo filters", "state": "ready", "changedAt": "..." }
]`,
      },
      {
        name: "restore_work_item_version",
        description: "Restore a work item to a previous version (non-destructive -- creates a new version)",
        params: [
          { name: "workItemId", type: "number", required: true, description: "Work item ID" },
          { name: "version", type: "number", required: true, description: "Version number to restore to" },
        ],
        example: `// Restore to version 1\nawait mcp.restore_work_item_version({\n  workItemId: 101,\n  version: 1\n})`,
        response: `{ "id": 101, "version": 3, "title": "Add filters", "state": "new", ... }`,
      },
      {
        name: "list_comments",
        description: "List comments for a work item",
        params: [
          { name: "workItemId", type: "number", required: true, description: "Work item ID" },
        ],
        example: `// List comments\nawait mcp.list_comments({ workItemId: 101 })`,
        response: `[
  { "id": 1, "author": "Hannes", "body": "Needs design review", "createdAt": "..." }
]`,
      },
      {
        name: "add_comment",
        description: "Add a comment to a work item",
        params: [
          { name: "workItemId", type: "number", required: true, description: "Work item ID" },
          { name: "author", type: "string", required: true, description: "Author name" },
          { name: "body", type: "string", required: true, description: "Comment body (markdown)" },
        ],
        example: `// Add a comment\nawait mcp.add_comment({\n  workItemId: 101,\n  author: "Claude",\n  body: "Backlog synced. 3 stories created."\n})`,
        response: `{ "id": 2, "author": "Claude", "body": "Backlog synced. 3 stories created.", ... }`,
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Shared components                                                  */
/* ------------------------------------------------------------------ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-1 rounded hover:bg-content-bg text-text-tertiary hover:text-text-secondary transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="relative bg-content-bg rounded-md overflow-hidden">
      {label && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50">
          <span className="text-[10px] text-text-tertiary uppercase tracking-wider">{label}</span>
          <CopyButton text={code} />
        </div>
      )}
      <pre className="text-xs text-text-secondary font-mono p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap">{code}</pre>
      {!label && (
        <div className="absolute top-2 right-2">
          <CopyButton text={code} />
        </div>
      )}
    </div>
  );
}

function ParamTable({ params }: { params: Param[] }) {
  if (params.length === 0) {
    return <p className="text-xs text-text-tertiary italic">No parameters</p>;
  }
  return (
    <div className="border border-border/50 rounded-md overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-content-bg/50">
            <th className="text-left px-3 py-1.5 text-text-tertiary font-medium">Parameter</th>
            <th className="text-left px-3 py-1.5 text-text-tertiary font-medium">Type</th>
            <th className="text-left px-3 py-1.5 text-text-tertiary font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p) => (
            <tr key={p.name} className="border-t border-border/30">
              <td className="px-3 py-1.5 font-mono text-blue-500">
                {p.name}
                {p.required && <span className="text-red-400 ml-0.5">*</span>}
              </td>
              <td className="px-3 py-1.5 text-text-tertiary font-mono">{p.type}</td>
              <td className="px-3 py-1.5 text-text-secondary">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Collapsible sections                                               */
/* ------------------------------------------------------------------ */

function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-content-bg/50 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-text-tertiary shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-tertiary shrink-0" />
        )}
        <span className="shrink-0">{icon}</span>
        <span className="text-sm font-semibold text-text-primary">{title}</span>
      </button>
      {open && <div className="px-5 pb-5 border-t border-border/50">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function McpToolsPage() {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  function toggleTool(name: string) {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-md bg-indigo-500 flex items-center justify-center">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">MCP Tools Reference</h1>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">
          Stori hosts an MCP server at <code className="px-1.5 py-0.5 bg-surface border border-border rounded text-xs font-mono">https://stori.zone/api/mcp</code> that
          exposes the full API as MCP tools for Claude Code, Claude Desktop, and other MCP-compatible clients.
          Nothing to install — connect over HTTP and authorize in the browser. This page documents every available tool,
          its parameters, and example usage.
        </p>
      </div>

      {/* Setup */}
      <div className="space-y-2 mb-8">
        <CollapsibleSection
          title="Setup"
          icon={<Terminal className="w-4 h-4 text-indigo-400" />}
          defaultOpen
        >
          <div className="space-y-4 pt-3">
            <div>
              <h3 className="text-xs font-semibold text-text-primary mb-2">One-line install</h3>
              <p className="text-xs text-text-secondary mb-2">
                Run this in any terminal where Claude Code is installed:
              </p>
              <CodeBlock code="claude mcp add --transport http stori https://stori.zone/api/mcp" />
              <p className="text-xs text-text-secondary mt-2">
                Then run <code className="px-1 py-0.5 bg-content-bg border border-border/50 rounded text-[11px] font-mono">/mcp</code> inside Claude Code
                to authorize. Your browser opens the Stori consent screen; once you approve, Claude Code stores the token and all tools become available.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-text-primary mb-2">Manual config (reference)</h3>
              <p className="text-xs text-text-secondary mb-2">
                The CLI command writes this block into <code className="px-1 py-0.5 bg-content-bg border border-border/50 rounded text-[11px] font-mono">.mcp.json</code> for
                you. Shown here in case you need to author the file by hand or sync it across machines:
              </p>
              <CodeBlock
                label=".mcp.json"
                code={`{
  "mcpServers": {
    "stori": {
      "type": "http",
      "url": "https://stori.zone/api/mcp"
    }
  }
}`}
              />
            </div>

            <div>
              <h3 className="text-xs font-semibold text-text-primary mb-2">Local Development</h3>
              <p className="text-xs text-text-secondary mb-2">
                Point at your local dev server instead:
              </p>
              <CodeBlock code="claude mcp add --transport http stori http://localhost:3100/api/mcp" />
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Authentication"
          icon={<Key className="w-4 h-4 text-amber-400" />}
        >
          <div className="space-y-3 pt-3 text-xs text-text-secondary leading-relaxed">
            <p>
              The HTTP MCP endpoint uses OAuth 2.1 with dynamic client registration. Claude Code (or any MCP client)
              handles the flow automatically — you approve the connection once in the browser, and the client stores the access token.
            </p>
            <div className="bg-content-bg rounded-md p-3 space-y-1.5">
              <p>1. Claude Code discovers the auth endpoints via <code className="font-mono text-[11px]">/api/mcp/.well-known/oauth-authorization-server</code></p>
              <p>2. It registers itself at <code className="font-mono text-[11px]">/api/mcp/register</code></p>
              <p>3. Your browser opens <code className="font-mono text-[11px]">/api/mcp/authorize</code> — sign in with your Stori account and approve</p>
              <p>4. Claude Code exchanges the code at <code className="font-mono text-[11px]">/api/mcp/token</code> and stores the access token</p>
            </div>
            <p>
              To re-authenticate, run <code className="px-1 py-0.5 bg-content-bg border border-border/50 rounded text-[11px] font-mono">/mcp</code> in
              Claude Code and pick the Stori server. Tokens auto-refresh; manual reset is only needed if you revoke access.
            </p>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Tips & Common Workflows"
          icon={<Lightbulb className="w-4 h-4 text-teal-400" />}
        >
          <div className="space-y-4 pt-3 text-xs text-text-secondary leading-relaxed">
            <div>
              <h3 className="text-xs font-semibold text-text-primary mb-1.5">Create a full feature with stories</h3>
              <CodeBlock
                code={`// 1. Create the feature
const feature = await mcp.create_work_item({
  projectId: 1, title: "Notification System", type: "feature",
  description: "## Overview\\nPush + in-app notifications..."
});

// 2. Add stories underneath
for (const story of stories) {
  await mcp.create_work_item({
    projectId: 1, type: "story",
    parentId: feature.id,
    title: story.title,
    description: story.description,
    points: story.points
  });
}`}
              />
            </div>

            <div>
              <h3 className="text-xs font-semibold text-text-primary mb-1.5">Run a TraQL query to find items</h3>
              <CodeBlock
                code={`// Find unassigned stories in the active sprint
await mcp.run_traql({
  query: "type:story sprint:active is:unassigned",
  projectId: 1
});

// Get a formatted standup list
await mcp.run_traql({
  query: 'SELECT format("- {title} ({state})") WHERE sprint:active assignee:Hannes'
});`}
              />
            </div>

            <div>
              <h3 className="text-xs font-semibold text-text-primary mb-1.5">Bulk update states</h3>
              <CodeBlock
                code={`// Find all "ready" stories and move them to "in_progress"
const items = await mcp.run_traql({
  query: "type:story state:ready sprint:active",
  projectId: 1
});

for (const item of items.results) {
  await mcp.update_work_item({
    id: item.id,
    state: "in_progress"
  });
}`}
              />
            </div>

            <div>
              <h3 className="text-xs font-semibold text-text-primary mb-1.5">Upload screenshots as attachments</h3>
              <CodeBlock
                code={`// Read a screenshot file and upload
const base64 = readFileSync("screenshot.png").toString("base64");
await mcp.upload_attachment({
  workItemId: 101,
  filename: "login-screen.png",
  contentType: "image/png",
  base64Data: base64
});`}
              />
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* Tool categories */}
      <h2 className="text-lg font-semibold text-text-primary mb-4">Tools</h2>
      <div className="space-y-2">
        {categories.map((cat) => (
          <CollapsibleSection
            key={cat.title}
            title={`${cat.title}`}
            icon={<span className="text-xs text-text-tertiary font-mono">{cat.tools.length}</span>}
          >
            <div className="space-y-1 pt-2">
              {cat.tools.map((tool) => {
                const isOpen = expandedTools.has(tool.name);
                return (
                  <div key={tool.name} className="rounded-md border border-border/30 overflow-hidden">
                    <button
                      onClick={() => toggleTool(tool.name)}
                      className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-content-bg/50 transition-colors"
                    >
                      {isOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-text-tertiary shrink-0 mt-0.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-text-tertiary shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <code className="text-[13px] font-semibold text-indigo-500">{tool.name}</code>
                        <p className="text-[11px] text-text-tertiary mt-0.5">{tool.description}</p>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-3 pb-3 space-y-3 border-t border-border/30 pt-3 ml-6">
                        <div>
                          <h4 className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2">Parameters</h4>
                          <ParamTable params={tool.params} />
                        </div>
                        <div>
                          <h4 className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2">Example</h4>
                          <CodeBlock code={tool.example} />
                        </div>
                        <div>
                          <h4 className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2">Response</h4>
                          <CodeBlock code={tool.response} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>
        ))}
      </div>

      <div className="mt-8 text-center text-xs text-text-tertiary">
        All tools communicate with Stori&apos;s REST API. The MCP server adds no additional business logic.
      </div>
    </div>
  );
}
