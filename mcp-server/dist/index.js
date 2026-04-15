#!/usr/bin/env node

// index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { execSync } from "child_process";
var BASE_URL = process.env.STORI_URL ?? "https://stori.zone";
var API_KEY = process.env.STORI_API_KEY;
var CRED_DIR = join(homedir(), ".stori");
var CRED_FILE = join(CRED_DIR, "credentials.json");
function loadStoredKey() {
  try {
    if (existsSync(CRED_FILE)) {
      const creds = JSON.parse(readFileSync(CRED_FILE, "utf-8"));
      if (creds[BASE_URL]) return creds[BASE_URL];
    }
  } catch {
  }
  return null;
}
function storeKey(key) {
  try {
    if (!existsSync(CRED_DIR)) mkdirSync(CRED_DIR, { recursive: true });
    const creds = existsSync(CRED_FILE) ? JSON.parse(readFileSync(CRED_FILE, "utf-8")) : {};
    creds[BASE_URL] = key;
    writeFileSync(CRED_FILE, JSON.stringify(creds, null, 2));
  } catch {
  }
}
async function deviceFlow() {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/device`, { method: "POST" });
    if (!res.ok) return null;
    const { code, verification_url } = await res.json();
    process.stderr.write(`
\u{1F510} Authorize Stori: ${verification_url}

`);
    try {
      const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
      execSync(`${cmd} "${verification_url}"`);
    } catch {
    }
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 5e3));
      const poll = await fetch(`${BASE_URL}/api/auth/device/${code}`);
      if (!poll.ok) continue;
      const data = await poll.json();
      if (data.status === "authorized" && data.api_key) {
        process.stderr.write("\u2705 Authorized!\n");
        return data.api_key;
      }
      if (data.status === "expired") {
        process.stderr.write("\u274C Authorization expired.\n");
        return null;
      }
    }
  } catch {
  }
  return null;
}
if (!API_KEY) {
  API_KEY = loadStoredKey() ?? void 0;
}
if (!API_KEY) {
  const key = await deviceFlow();
  if (key) {
    API_KEY = key;
    storeKey(key);
  }
}
async function api(path, options) {
  const headers = {
    "Content-Type": "application/json",
    "X-Stori-Channel": "mcp",
    ...options?.headers
  };
  if (API_KEY) {
    headers["Authorization"] = `Bearer ${API_KEY}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}
function textResult(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}
var server = new McpServer({
  name: "stori",
  version: "1.0.0"
});
server.tool(
  "list_projects",
  "List all projects in Stori",
  {},
  async () => textResult(await api("/api/projects"))
);
server.tool(
  "create_project",
  "Create a new project",
  { name: z.string(), key: z.string().describe("2-5 char uppercase key, e.g. PIC"), description: z.string().optional() },
  async (params) => textResult(await api("/api/projects", { method: "POST", body: JSON.stringify(params) }))
);
server.tool(
  "list_work_items",
  "List work items with optional filters",
  {
    projectId: z.number().optional().describe("Filter by project ID"),
    type: z.enum(["epic", "feature", "story", "bug", "task"]).optional(),
    state: z.string().optional().describe("Workflow state slug"),
    sprintId: z.number().optional(),
    parentId: z.number().optional(),
    query: z.string().optional().describe("Search title")
  },
  async (params) => {
    const qs = new URLSearchParams();
    if (params.projectId) qs.set("projectId", String(params.projectId));
    if (params.type) qs.set("type", params.type);
    if (params.state) qs.set("state", params.state);
    if (params.sprintId) qs.set("sprintId", String(params.sprintId));
    if (params.parentId) qs.set("parentId", String(params.parentId));
    if (params.query) qs.set("q", params.query);
    return textResult(await api(`/api/work-items?${qs}`));
  }
);
server.tool(
  "get_work_item",
  "Get a single work item by ID or displayId like 'TRK-5' (includes children)",
  { id: z.union([z.number(), z.string()]).describe("Numeric ID or displayId like 'TRK-5'") },
  async (params) => textResult(await api(`/api/work-items/${params.id}`))
);
server.tool(
  "create_work_item",
  "Create a new work item (epic, feature, or story)",
  {
    projectId: z.number().describe("Project ID"),
    title: z.string(),
    type: z.enum(["epic", "feature", "story", "bug", "task"]),
    description: z.string().optional(),
    parentId: z.number().optional().describe("Parent work item ID"),
    sprintId: z.number().optional(),
    assignee: z.string().optional(),
    state: z.string().optional().describe("Workflow state slug"),
    points: z.number().nullable().optional().describe("Story points (fibonacci: 1,2,3,5,8,13)"),
    priority: z.number().optional()
  },
  async (params) => textResult(await api("/api/work-items", { method: "POST", body: JSON.stringify(params) }))
);
server.tool(
  "update_work_item",
  "Update fields on a work item",
  {
    id: z.union([z.number(), z.string()]).describe("Numeric ID or displayId like 'TRK-5'"),
    title: z.string().optional(),
    type: z.enum(["epic", "feature", "story", "bug", "task"]).optional(),
    state: z.string().optional().describe("Workflow state slug"),
    description: z.string().optional(),
    parentId: z.number().nullable().optional(),
    sprintId: z.number().nullable().optional(),
    assignee: z.string().nullable().optional(),
    points: z.number().nullable().optional().describe("Story points (fibonacci: 1,2,3,5,8,13)"),
    priority: z.number().optional()
  },
  async ({ id, ...data }) => textResult(await api(`/api/work-items/${id}`, { method: "PATCH", body: JSON.stringify(data) }))
);
server.tool(
  "delete_work_item",
  "Delete a work item",
  { id: z.union([z.number(), z.string()]).describe("Numeric ID or displayId like 'TRK-5'") },
  async (params) => textResult(await api(`/api/work-items/${params.id}`, { method: "DELETE" }))
);
server.tool(
  "list_attachments",
  "List attachments for a work item",
  { workItemId: z.number() },
  async (params) => textResult(await api(`/api/work-items/${params.workItemId}/attachments`))
);
server.tool(
  "upload_attachment",
  "Upload an image attachment to a work item. Provide base64-encoded file data.",
  { workItemId: z.number(), filename: z.string(), contentType: z.string().describe("e.g. image/png"), base64Data: z.string() },
  async ({ workItemId, filename, contentType, base64Data }) => {
    const buffer = Buffer.from(base64Data, "base64");
    const blob = new Blob([buffer], { type: contentType });
    const formData = new FormData();
    formData.append("file", blob, filename);
    const res = await fetch(`${BASE_URL}/api/work-items/${workItemId}/attachments`, {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return textResult(data);
  }
);
server.tool(
  "get_status_history",
  "Get the status change history for a work item (shows when it moved between states)",
  { workItemId: z.number() },
  async (params) => textResult(await api(`/api/work-items/${params.workItemId}/history`))
);
server.tool(
  "get_work_item_versions",
  "Get all snapshots/versions of a work item with full field history",
  { workItemId: z.number() },
  async (params) => textResult(await api(`/api/work-items/${params.workItemId}/versions`))
);
server.tool(
  "restore_work_item_version",
  "Restore a work item to a previous version (non-destructive \u2014 creates a new version)",
  { workItemId: z.number(), version: z.number().describe("Version number to restore to") },
  async (params) => textResult(await api(`/api/work-items/${params.workItemId}/restore`, { method: "POST", body: JSON.stringify({ version: params.version }) }))
);
server.tool(
  "list_comments",
  "List comments for a work item",
  { workItemId: z.number() },
  async (params) => textResult(await api(`/api/work-items/${params.workItemId}/comments`))
);
server.tool(
  "add_comment",
  "Add a comment to a work item",
  { workItemId: z.number(), author: z.string(), body: z.string() },
  async ({ workItemId, ...data }) => textResult(await api(`/api/work-items/${workItemId}/comments`, { method: "POST", body: JSON.stringify(data) }))
);
server.tool(
  "get_hierarchy",
  "Get the full epic > feature > story tree",
  { projectId: z.number().optional(), rootId: z.number().optional() },
  async (params) => {
    const qs = new URLSearchParams();
    if (params.projectId) qs.set("projectId", String(params.projectId));
    if (params.rootId) qs.set("rootId", String(params.rootId));
    return textResult(await api(`/api/hierarchy?${qs}`));
  }
);
server.tool(
  "list_sprints",
  "List sprints, optionally filtered by project or state",
  { projectId: z.number().optional(), state: z.enum(["planning", "active", "closed"]).optional() },
  async (params) => {
    const qs = new URLSearchParams();
    if (params.projectId) qs.set("projectId", String(params.projectId));
    if (params.state) qs.set("state", params.state);
    return textResult(await api(`/api/sprints?${qs}`));
  }
);
server.tool(
  "create_sprint",
  "Create a new sprint",
  {
    projectId: z.number(),
    name: z.string(),
    goal: z.string().optional(),
    startDate: z.string().optional().describe("ISO date e.g. 2026-04-14"),
    endDate: z.string().optional().describe("ISO date")
  },
  async (params) => textResult(await api("/api/sprints", { method: "POST", body: JSON.stringify(params) }))
);
server.tool(
  "update_sprint",
  "Update a sprint",
  {
    id: z.number(),
    name: z.string().optional(),
    goal: z.string().nullable().optional(),
    state: z.enum(["planning", "active", "closed"]).optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional()
  },
  async ({ id, ...data }) => textResult(await api(`/api/sprints/${id}`, { method: "PATCH", body: JSON.stringify(data) }))
);
server.tool(
  "run_traql",
  `Run a TraQL query. Returns work items, aggregates, or formatted text. Examples: 'type:story is:open', 'SELECT count() GROUP BY state', 'SELECT format("- {title}") WHERE sprint:active'`,
  {
    query: z.string().describe("TraQL query string"),
    projectId: z.number().optional().describe("Scope to a project ID. Omit for cross-project queries using project: field.")
  },
  async (params) => textResult(await api("/api/traql", { method: "POST", body: JSON.stringify(params) }))
);
server.tool(
  "get_workflow",
  "Get the workflow states for a project, ordered by position",
  { projectId: z.number() },
  async ({ projectId }) => textResult(await api(`/api/projects/${projectId}/workflow`))
);
server.tool(
  "add_workflow_state",
  "Add a new state to a project's workflow",
  { projectId: z.number(), displayName: z.string(), category: z.enum(["todo", "in_progress", "done"]), color: z.string().optional() },
  async ({ projectId, ...data }) => textResult(await api(`/api/projects/${projectId}/workflow`, { method: "POST", body: JSON.stringify(data) }))
);
server.tool(
  "update_workflow_state",
  "Update a workflow state (display name, category, or color \u2014 slug is immutable)",
  { projectId: z.number(), stateId: z.number(), displayName: z.string().optional(), category: z.enum(["todo", "in_progress", "done"]).optional(), color: z.string().optional() },
  async ({ projectId, stateId, ...data }) => textResult(await api(`/api/projects/${projectId}/workflow/${stateId}`, { method: "PATCH", body: JSON.stringify(data) }))
);
server.tool(
  "delete_workflow_state",
  "Delete a workflow state. Cannot delete the last state in a category. If items exist in this state, provide migrateToSlug.",
  { projectId: z.number(), stateId: z.number(), migrateToSlug: z.string().optional() },
  async ({ projectId, stateId, ...data }) => textResult(await api(`/api/projects/${projectId}/workflow/${stateId}`, { method: "DELETE", body: JSON.stringify(data) }))
);
server.tool(
  "list_links",
  "List all links for a work item",
  { workItemId: z.number() },
  async ({ workItemId }) => textResult(await api(`/api/work-items/${workItemId}/links`))
);
server.tool(
  "create_link",
  "Create a link between two work items. Inverse link is created automatically.",
  { workItemId: z.number(), targetId: z.number(), type: z.enum(["blocks", "blocked_by", "relates_to", "duplicates"]) },
  async ({ workItemId, ...data }) => textResult(await api(`/api/work-items/${workItemId}/links`, { method: "POST", body: JSON.stringify(data) }))
);
server.tool(
  "delete_link",
  "Delete a work item link and its inverse",
  { workItemId: z.number(), linkId: z.number() },
  async ({ workItemId, linkId }) => textResult(await api(`/api/work-items/${workItemId}/links/${linkId}`, { method: "DELETE" }))
);
server.tool(
  "list_saved_queries",
  "List saved TraQL queries for a project",
  { projectId: z.number() },
  async ({ projectId }) => textResult(await api(`/api/saved-queries?projectId=${projectId}`))
);
server.tool(
  "save_query",
  "Save a TraQL query",
  { projectId: z.number(), name: z.string(), query: z.string() },
  async (params) => textResult(await api("/api/saved-queries", { method: "POST", body: JSON.stringify(params) }))
);
var transport = new StdioServerTransport();
await server.connect(transport);
