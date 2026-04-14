"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check, ArrowLeft } from "lucide-react";
import Link from "next/link";

/* ---------- types ---------- */

interface Endpoint {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  params?: string;
  body?: string;
  response: string;
  curl: string;
}

interface EndpointGroup {
  title: string;
  description: string;
  endpoints: Endpoint[];
}

/* ---------- data ---------- */

const groups: EndpointGroup[] = [
  {
    title: "Projects",
    description: "Create, list, update, and delete projects. Each project has a unique key (2\u20135 uppercase chars).",
    endpoints: [
      {
        method: "GET",
        path: "/api/projects",
        description: "List all projects.",
        response: `[{ "id": 1, "name": "Pictura", "key": "PIC", "description": "...", "visibility": "public", "ownerId": "...", "createdAt": "...", "updatedAt": "..." }]`,
        curl: `curl http://localhost:3100/api/projects`,
      },
      {
        method: "POST",
        path: "/api/projects",
        description: "Create a new project.",
        body: `{
  "name": "My Project",       // required, min 1 char
  "key": "MYP",               // required, 2-5 chars, auto-uppercased
  "description": "Optional",  // optional
  "visibility": "private"     // optional, "public" | "private" (default)
}`,
        response: `{ "id": 2, "name": "My Project", "key": "MYP", "description": "Optional", "visibility": "private", "ownerId": "...", "createdAt": "...", "updatedAt": "..." }`,
        curl: `curl -X POST http://localhost:3100/api/projects \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My Project", "key": "MYP"}'`,
      },
      {
        method: "GET",
        path: "/api/projects/:id",
        description: "Get a single project by ID.",
        params: `id — Project ID (number)`,
        response: `{ "id": 1, "name": "Pictura", "key": "PIC", "description": "...", "visibility": "public", "ownerId": "...", "createdAt": "...", "updatedAt": "..." }`,
        curl: `curl http://localhost:3100/api/projects/1`,
      },
      {
        method: "PATCH",
        path: "/api/projects/:id",
        description: "Update a project. All fields optional.",
        params: `id — Project ID (number)`,
        body: `{
  "name": "New Name",         // optional
  "key": "NEW",               // optional, 2-5 chars
  "description": "Updated",   // optional
  "visibility": "public"      // optional
}`,
        response: `{ "id": 1, "name": "New Name", "key": "NEW", ... }`,
        curl: `curl -X PATCH http://localhost:3100/api/projects/1 \\
  -H "Content-Type: application/json" \\
  -d '{"name": "New Name"}'`,
      },
      {
        method: "DELETE",
        path: "/api/projects/:id",
        description: "Delete a project and all its work items, sprints, comments, and attachments.",
        params: `id — Project ID (number)`,
        response: `{ "deleted": true }`,
        curl: `curl -X DELETE http://localhost:3100/api/projects/1`,
      },
    ],
  },
  {
    title: "Project Members",
    description: "List members of a project (owner, invited users, and assignees for public projects).",
    endpoints: [
      {
        method: "GET",
        path: "/api/projects/:id/members",
        description: "List all members of a project.",
        params: `id — Project ID (number)`,
        response: `[{ "id": "user-id", "name": "Hannes", "email": "hannes@example.com", "image": "..." }]`,
        curl: `curl http://localhost:3100/api/projects/1/members`,
      },
    ],
  },
  {
    title: "Workflow States",
    description: "Each project has configurable workflow states in three categories: todo, in_progress, done. You can create individual states or apply a preset.",
    endpoints: [
      {
        method: "GET",
        path: "/api/projects/:id/workflow",
        description: "List all workflow states for a project, ordered by position.",
        params: `id — Project ID (number)`,
        response: `[{ "id": 1, "slug": "new", "displayName": "New", "position": 0, "category": "todo", "color": "#9CA3AF" }]`,
        curl: `curl http://localhost:3100/api/projects/1/workflow`,
      },
      {
        method: "POST",
        path: "/api/projects/:id/workflow",
        description: "Create a new workflow state, or apply a preset (simple, standard, delivery_pipeline).",
        params: `id — Project ID (number)`,
        body: `// Option A: Create a single state
{
  "displayName": "In Review",       // required
  "category": "in_progress",        // required: "todo" | "in_progress" | "done"
  "color": "#F59E0B"                // optional, defaults to #9CA3AF
}

// Option B: Apply a preset (replaces all states)
{
  "preset": "standard"              // "simple" | "standard" | "delivery_pipeline"
}`,
        response: `// Single state:
{ "id": 5, "slug": "in_review", "displayName": "In Review", "position": 4, "category": "in_progress", "color": "#F59E0B" }

// Preset: returns array of all new states`,
        curl: `curl -X POST http://localhost:3100/api/projects/1/workflow \\
  -H "Content-Type: application/json" \\
  -d '{"displayName": "In Review", "category": "in_progress"}'`,
      },
      {
        method: "PATCH",
        path: "/api/projects/:id/workflow/:stateId",
        description: "Update a workflow state. All fields optional.",
        params: `id — Project ID (number)
stateId — Workflow state ID (number)`,
        body: `{
  "displayName": "Under Review",  // optional
  "category": "in_progress",      // optional
  "color": "#F59E0B"              // optional
}`,
        response: `{ "id": 5, "slug": "in_review", "displayName": "Under Review", ... }`,
        curl: `curl -X PATCH http://localhost:3100/api/projects/1/workflow/5 \\
  -H "Content-Type: application/json" \\
  -d '{"displayName": "Under Review"}'`,
      },
      {
        method: "DELETE",
        path: "/api/projects/:id/workflow/:stateId",
        description: "Delete a workflow state. Cannot delete the last state in a category. If work items use this state, provide migrateToSlug.",
        params: `id — Project ID (number)
stateId — Workflow state ID (number)`,
        body: `{
  "migrateToSlug": "new"   // required if items use this state
}`,
        response: `{ "deleted": true }`,
        curl: `curl -X DELETE http://localhost:3100/api/projects/1/workflow/5`,
      },
      {
        method: "POST",
        path: "/api/projects/:id/workflow/reorder",
        description: "Reorder workflow states by providing an ordered array of state IDs.",
        params: `id — Project ID (number)`,
        body: `{
  "ids": [3, 1, 2, 5, 4]   // ordered array of workflow state IDs
}`,
        response: `[{ "id": 3, "slug": "new", "position": 0, ... }, { "id": 1, "slug": "ready", "position": 1, ... }]`,
        curl: `curl -X POST http://localhost:3100/api/projects/1/workflow/reorder \\
  -H "Content-Type: application/json" \\
  -d '{"ids": [3, 1, 2, 5, 4]}'`,
      },
    ],
  },
  {
    title: "Work Items",
    description: "CRUD for work items (epics, features, stories, bugs, tasks). Items belong to a project and optionally to a parent and sprint.",
    endpoints: [
      {
        method: "GET",
        path: "/api/work-items",
        description: "List work items with optional filters.",
        params: `Query params (all optional):
  projectId — Filter by project
  type      — "epic" | "feature" | "story" | "bug" | "task"
  state     — Filter by state slug
  sprintId  — Filter by sprint
  parentId  — Filter by parent work item
  q         — Search title (contains)`,
        response: `[{ "id": 1, "projectId": 1, "title": "...", "type": "story", "state": "new", "description": "...", "parentId": null, "sprintId": null, "assignee": null, "points": null, "priority": 0, "createdAt": "...", "updatedAt": "..." }]`,
        curl: `curl "http://localhost:3100/api/work-items?projectId=1&type=story"`,
      },
      {
        method: "POST",
        path: "/api/work-items",
        description: "Create a new work item.",
        body: `{
  "projectId": 1,              // required
  "title": "Build login page", // required
  "type": "story",             // required: "epic" | "feature" | "story" | "bug" | "task"
  "state": "new",              // optional, defaults to project default
  "description": "Details...", // optional
  "parentId": 5,               // optional, parent work item ID
  "sprintId": 2,               // optional
  "assignee": "Hannes",        // optional
  "points": 5,                 // optional, one of: 1, 2, 3, 5, 8, 13
  "priority": 1                // optional, integer
}`,
        response: `{ "id": 42, "projectId": 1, "title": "Build login page", "type": "story", "state": "new", ... }`,
        curl: `curl -X POST http://localhost:3100/api/work-items \\
  -H "Content-Type: application/json" \\
  -d '{"projectId": 1, "title": "Build login page", "type": "story"}'`,
      },
      {
        method: "GET",
        path: "/api/work-items/:id",
        description: "Get a single work item with its children.",
        params: `id — Work item ID (number)`,
        response: `{ "id": 42, "projectId": 1, "title": "...", "type": "story", ..., "children": [{ "id": 43, ... }] }`,
        curl: `curl http://localhost:3100/api/work-items/42`,
      },
      {
        method: "PATCH",
        path: "/api/work-items/:id",
        description: "Update a work item. All fields optional. State changes are recorded in status history.",
        params: `id — Work item ID (number)`,
        body: `{
  "title": "Updated title",   // optional
  "type": "bug",              // optional
  "state": "in_progress",     // optional
  "description": "New desc",  // optional
  "parentId": 5,              // optional, null to unset
  "sprintId": 2,              // optional, null to unset
  "assignee": "Hannes",       // optional, null to unset
  "points": 8,                // optional, one of: 1, 2, 3, 5, 8, 13
  "priority": 2               // optional
}`,
        response: `{ "id": 42, "title": "Updated title", "state": "in_progress", ... }`,
        curl: `curl -X PATCH http://localhost:3100/api/work-items/42 \\
  -H "Content-Type: application/json" \\
  -d '{"state": "in_progress", "assignee": "Hannes"}'`,
      },
      {
        method: "DELETE",
        path: "/api/work-items/:id",
        description: "Delete a work item.",
        params: `id — Work item ID (number)`,
        response: `{ "deleted": true }`,
        curl: `curl -X DELETE http://localhost:3100/api/work-items/42`,
      },
    ],
  },
  {
    title: "Comments",
    description: "Add and list comments on work items.",
    endpoints: [
      {
        method: "GET",
        path: "/api/work-items/:id/comments",
        description: "List all comments on a work item, ordered by creation time.",
        params: `id — Work item ID (number)`,
        response: `[{ "id": 1, "workItemId": 42, "author": "Hannes", "body": "Looks good!", "createdAt": "..." }]`,
        curl: `curl http://localhost:3100/api/work-items/42/comments`,
      },
      {
        method: "POST",
        path: "/api/work-items/:id/comments",
        description: "Add a comment. Author defaults to the authenticated user if not provided.",
        params: `id — Work item ID (number)`,
        body: `{
  "body": "Looks good!",   // required
  "author": "Hannes"       // optional, defaults to session user
}`,
        response: `{ "id": 10, "workItemId": 42, "author": "Hannes", "body": "Looks good!", "createdAt": "..." }`,
        curl: `curl -X POST http://localhost:3100/api/work-items/42/comments \\
  -H "Content-Type: application/json" \\
  -d '{"body": "Looks good!"}'`,
      },
    ],
  },
  {
    title: "Links",
    description: "Create dependency and relationship links between work items. Links are bidirectional: creating a \"blocks\" link also creates an inverse \"blocked_by\" link.",
    endpoints: [
      {
        method: "GET",
        path: "/api/work-items/:id/links",
        description: "List all links for a work item (both directions).",
        params: `id — Work item ID (number)`,
        response: `[{ "id": 1, "sourceId": 42, "targetId": 43, "type": "blocks", "createdAt": "..." }]`,
        curl: `curl http://localhost:3100/api/work-items/42/links`,
      },
      {
        method: "POST",
        path: "/api/work-items/:id/links",
        description: "Create a link between two work items. An inverse link is created automatically.",
        params: `id — Source work item ID (number)`,
        body: `{
  "targetId": 43,            // required, target work item ID
  "type": "blocks"           // required: "blocks" | "blocked_by" | "relates_to" | "duplicates"
}`,
        response: `{
  "link": { "id": 5, "sourceId": 42, "targetId": 43, "type": "blocks", "createdAt": "..." },
  "inverse": { "id": 6, "sourceId": 43, "targetId": 42, "type": "blocked_by", "createdAt": "..." }
}`,
        curl: `curl -X POST http://localhost:3100/api/work-items/42/links \\
  -H "Content-Type: application/json" \\
  -d '{"targetId": 43, "type": "blocks"}'`,
      },
      {
        method: "DELETE",
        path: "/api/work-items/:id/links/:linkId",
        description: "Delete a link and its inverse. The link must belong to the specified work item as source.",
        params: `id — Work item ID (number)
linkId — Link ID (number)`,
        response: `{ "deleted": true }`,
        curl: `curl -X DELETE http://localhost:3100/api/work-items/42/links/5`,
      },
    ],
  },
  {
    title: "Attachments",
    description: "Upload and list file attachments on work items. Upload uses multipart/form-data.",
    endpoints: [
      {
        method: "GET",
        path: "/api/work-items/:id/attachments",
        description: "List all attachments on a work item (metadata only, no file data).",
        params: `id — Work item ID (number)`,
        response: `[{ "id": 1, "workItemId": 42, "filename": "screenshot.png", "contentType": "image/png", "createdAt": "..." }]`,
        curl: `curl http://localhost:3100/api/work-items/42/attachments`,
      },
      {
        method: "POST",
        path: "/api/work-items/:id/attachments",
        description: "Upload a file attachment. Use multipart/form-data with a \"file\" field.",
        params: `id — Work item ID (number)`,
        body: `multipart/form-data:
  file — The file to upload`,
        response: `{ "id": 3, "workItemId": 42, "filename": "screenshot.png", "contentType": "image/png", "createdAt": "..." }`,
        curl: `curl -X POST http://localhost:3100/api/work-items/42/attachments \\
  -F "file=@screenshot.png"`,
      },
    ],
  },
  {
    title: "Sprints",
    description: "Create, list, and update sprints. Sprints belong to a project and move through planning \u2192 active \u2192 closed.",
    endpoints: [
      {
        method: "GET",
        path: "/api/sprints",
        description: "List sprints with optional filters.",
        params: `Query params (all optional):
  projectId — Filter by project
  state     — "planning" | "active" | "closed"`,
        response: `[{ "id": 1, "projectId": 1, "name": "Sprint 1", "goal": "...", "state": "active", "startDate": "2026-04-01", "endDate": "2026-04-14", "createdAt": "..." }]`,
        curl: `curl "http://localhost:3100/api/sprints?projectId=1&state=active"`,
      },
      {
        method: "POST",
        path: "/api/sprints",
        description: "Create a new sprint.",
        body: `{
  "projectId": 1,                  // required
  "name": "Sprint 10",            // required
  "goal": "Ship auth feature",    // optional
  "startDate": "2026-04-14",      // optional
  "endDate": "2026-04-28"         // optional
}`,
        response: `{ "id": 10, "projectId": 1, "name": "Sprint 10", "goal": "Ship auth feature", "state": "planning", "startDate": "2026-04-14", "endDate": "2026-04-28", "createdAt": "..." }`,
        curl: `curl -X POST http://localhost:3100/api/sprints \\
  -H "Content-Type: application/json" \\
  -d '{"projectId": 1, "name": "Sprint 10"}'`,
      },
      {
        method: "GET",
        path: "/api/sprints/:id",
        description: "Get a single sprint by ID.",
        params: `id — Sprint ID (number)`,
        response: `{ "id": 1, "projectId": 1, "name": "Sprint 1", "goal": "...", "state": "active", ... }`,
        curl: `curl http://localhost:3100/api/sprints/1`,
      },
      {
        method: "PATCH",
        path: "/api/sprints/:id",
        description: "Update a sprint. All fields optional.",
        params: `id — Sprint ID (number)`,
        body: `{
  "name": "Sprint 10 (extended)",  // optional
  "goal": "Updated goal",          // optional, null to clear
  "startDate": "2026-04-14",       // optional, null to clear
  "endDate": "2026-04-30",         // optional, null to clear
  "state": "active"                // optional: "planning" | "active" | "closed"
}`,
        response: `{ "id": 10, "name": "Sprint 10 (extended)", "state": "active", ... }`,
        curl: `curl -X PATCH http://localhost:3100/api/sprints/10 \\
  -H "Content-Type: application/json" \\
  -d '{"state": "active"}'`,
      },
    ],
  },
  {
    title: "TraQL",
    description: "Execute TraQL queries against work items. Rate limited to 30 queries per minute.",
    endpoints: [
      {
        method: "POST",
        path: "/api/traql",
        description: "Execute a TraQL query. Returns matching work items or aggregation results.",
        body: `{
  "query": "type:story is:open",   // required, max 2000 chars
  "projectId": 1                   // optional, scope to a project
}`,
        response: `// For item queries:
{ "items": [{ "id": 42, "title": "...", ... }], "count": 5 }

// For aggregations:
{ "result": 42 }
// or
{ "result": { "new": 5, "in_progress": 3, "done": 12 } }`,
        curl: `curl -X POST http://localhost:3100/api/traql \\
  -H "Content-Type: application/json" \\
  -d '{"query": "type:story is:open", "projectId": 1}'`,
      },
    ],
  },
  {
    title: "Saved Queries",
    description: "Save, list, update, and delete TraQL queries. Requires authentication. Queries can be starred and shared with other project members.",
    endpoints: [
      {
        method: "GET",
        path: "/api/saved-queries",
        description: "List saved queries for a project. Returns your queries and shared queries from others.",
        params: `Query params:
  projectId — required, filter by project`,
        response: `[{ "id": 1, "projectId": 1, "userId": "...", "name": "Open bugs", "query": "type:bug is:open", "starred": false, "shared": false, "createdAt": "...", "userName": "Hannes", "userEmail": "..." }]`,
        curl: `curl "http://localhost:3100/api/saved-queries?projectId=1" \\
  -H "Authorization: Bearer <token>"`,
      },
      {
        method: "POST",
        path: "/api/saved-queries",
        description: "Save a new query.",
        body: `{
  "projectId": 1,                     // required
  "name": "Open bugs",                // required
  "query": "type:bug is:open"         // required
}`,
        response: `{ "id": 5, "projectId": 1, "userId": "...", "name": "Open bugs", "query": "type:bug is:open", "starred": false, "shared": false, "createdAt": "..." }`,
        curl: `curl -X POST http://localhost:3100/api/saved-queries \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <token>" \\
  -d '{"projectId": 1, "name": "Open bugs", "query": "type:bug is:open"}'`,
      },
      {
        method: "PATCH",
        path: "/api/saved-queries/:id",
        description: "Update a saved query. Only the owner can update. All fields optional.",
        params: `id — Saved query ID (number)`,
        body: `{
  "name": "Critical bugs",     // optional
  "query": "type:bug is:open priority:>3",  // optional
  "starred": true,             // optional
  "shared": true               // optional
}`,
        response: `{ "id": 5, "name": "Critical bugs", "query": "type:bug is:open priority:>3", "starred": true, "shared": true, ... }`,
        curl: `curl -X PATCH http://localhost:3100/api/saved-queries/5 \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <token>" \\
  -d '{"starred": true, "shared": true}'`,
      },
      {
        method: "DELETE",
        path: "/api/saved-queries/:id",
        description: "Delete a saved query. Only the owner can delete.",
        params: `id — Saved query ID (number)`,
        response: `{ "deleted": true }`,
        curl: `curl -X DELETE http://localhost:3100/api/saved-queries/5 \\
  -H "Authorization: Bearer <token>"`,
      },
    ],
  },
];

/* ---------- components ---------- */

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-600",
  POST: "bg-blue-500/15 text-blue-600",
  PATCH: "bg-amber-500/15 text-amber-600",
  DELETE: "bg-red-500/15 text-red-600",
};

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

function MethodBadge({ method }: { method: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold font-mono ${METHOD_COLORS[method] ?? "bg-gray-500/15 text-gray-600"}`}>
      {method}
    </span>
  );
}

function EndpointDetail({ ep }: { ep: Endpoint }) {
  return (
    <div className="border-t border-border/50 px-5 py-4 space-y-3">
      <div className="flex items-center gap-2">
        <MethodBadge method={ep.method} />
        <code className="text-[13px] font-mono text-text-primary">{ep.path}</code>
      </div>
      <p className="text-xs text-text-secondary">{ep.description}</p>

      {ep.params && (
        <div>
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Parameters</p>
          <pre className="text-xs text-text-secondary font-mono bg-content-bg rounded-md p-3 overflow-x-auto whitespace-pre-wrap">{ep.params}</pre>
        </div>
      )}

      {ep.body && (
        <div>
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Request Body</p>
          <pre className="text-xs text-text-secondary font-mono bg-content-bg rounded-md p-3 overflow-x-auto whitespace-pre-wrap">{ep.body}</pre>
        </div>
      )}

      <div>
        <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Response</p>
        <pre className="text-xs text-text-secondary font-mono bg-content-bg rounded-md p-3 overflow-x-auto whitespace-pre-wrap">{ep.response}</pre>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Example</p>
          <CopyButton text={ep.curl} />
        </div>
        <pre className="text-xs text-text-secondary font-mono bg-content-bg rounded-md p-3 overflow-x-auto whitespace-pre-wrap">{ep.curl}</pre>
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export default function ApiReferencePage() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  function toggle(idx: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const totalEndpoints = groups.reduce((sum, g) => sum + g.endpoints.length, 0);

  return (
    <div className="min-h-screen bg-content-bg">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-accent transition-colors mb-6"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Docs
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <svg width="32" height="32" viewBox="0 0 32 32" className="shrink-0">
              <rect width="32" height="32" rx="6" fill="#6366F1" />
              <rect x="7" y="8" width="5" height="16" rx="1.5" fill="white" opacity="0.9" />
              <rect x="14" y="12" width="5" height="12" rx="1.5" fill="white" opacity="0.7" />
              <rect x="21" y="10" width="5" height="14" rx="1.5" fill="white" opacity="0.5" />
            </svg>
            <h1 className="text-2xl font-bold text-text-primary">REST API Reference</h1>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            Complete reference for the Stori REST API. All endpoints accept and return JSON unless
            noted otherwise. Base URL: <code className="text-xs bg-content-bg border border-border rounded px-1.5 py-0.5 font-mono">http://localhost:3100/api</code>
          </p>
        </div>

        {/* Summary */}
        <div className="bg-surface border border-border rounded-lg p-5 mb-8">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Overview</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-content-bg rounded-md p-3 text-center">
              <p className="text-lg font-bold text-text-primary">{totalEndpoints}</p>
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Endpoints</p>
            </div>
            <div className="bg-content-bg rounded-md p-3 text-center">
              <p className="text-lg font-bold text-text-primary">{groups.length}</p>
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Resources</p>
            </div>
            <div className="bg-content-bg rounded-md p-3 text-center">
              <p className="text-lg font-bold text-text-primary">REST</p>
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Protocol</p>
            </div>
          </div>
          <div className="mt-3 text-xs text-text-secondary">
            <strong>Authentication:</strong> Include{" "}
            <code className="text-[11px] bg-content-bg border border-border rounded px-1 py-0.5 font-mono">
              Authorization: Bearer &lt;token&gt;
            </code>{" "}
            for authenticated endpoints. Some read endpoints work without auth.
          </div>
        </div>

        {/* Endpoint groups */}
        <div className="space-y-2">
          {groups.map((group, gi) => (
            <div key={gi} className="bg-surface border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggle(gi)}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-content-bg/50 transition-colors"
              >
                {expanded.has(gi) ? (
                  <ChevronDown className="w-4 h-4 text-text-tertiary shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-text-tertiary shrink-0" />
                )}
                <span className="text-sm font-semibold text-text-primary">{group.title}</span>
                <span className="text-xs text-text-tertiary ml-2">
                  {group.endpoints.length} endpoint{group.endpoints.length !== 1 ? "s" : ""}
                </span>
                <div className="ml-auto flex gap-1">
                  {[...new Set(group.endpoints.map((e) => e.method))].map((m) => (
                    <MethodBadge key={m} method={m} />
                  ))}
                </div>
              </button>

              {expanded.has(gi) && (
                <div>
                  <div className="px-5 py-3 border-t border-border/50">
                    <p className="text-xs text-text-secondary leading-relaxed">{group.description}</p>
                  </div>
                  {group.endpoints.map((ep, ei) => (
                    <EndpointDetail key={ei} ep={ep} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 bg-surface border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Error Responses</h2>
          <p className="text-xs text-text-secondary mb-3">
            All error responses follow a consistent shape:
          </p>
          <pre className="text-xs text-text-secondary font-mono bg-content-bg rounded-md p-4 overflow-x-auto">{`{
  "error": "Description of the error"   // string or object with field-level errors
}

// HTTP status codes:
// 400 — Bad request (validation error)
// 401 — Unauthorized
// 403 — Forbidden (not the owner)
// 404 — Not found
// 409 — Conflict (duplicate slug, etc.)
// 429 — Rate limited (TraQL: 30 req/min)`}</pre>
        </div>

        <div className="mt-6 text-center text-xs text-text-tertiary">
          See also:{" "}
          <Link href="/docs/traql" className="text-accent hover:underline">
            TraQL Reference
          </Link>
          {" \u00b7 "}
          <Link href="/docs/mcp" className="text-accent hover:underline">
            MCP Tools
          </Link>
        </div>
      </div>
    </div>
  );
}
