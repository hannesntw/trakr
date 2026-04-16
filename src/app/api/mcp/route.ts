import { NextRequest } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * Streamable HTTP MCP endpoint.
 * Users connect with: claude mcp add --transport http stori https://stori.zone/api/mcp
 * Auth via Bearer token in the Authorization header (same API key as REST API).
 */

function createServer(baseUrl: string, apiKey: string) {
  const server = new McpServer({ name: "stori", version: "1.0.0" });

  async function api(path: string, options?: RequestInit) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "X-Stori-Channel": "mcp",
        ...options?.headers as Record<string, string>,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data;
  }

  function textResult(data: unknown) {
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }

  // --- Projects ---
  server.tool("list_projects", "List all projects", {}, async () => textResult(await api("/api/projects")));
  server.tool("create_project", "Create a new project", { name: z.string(), key: z.string().describe("2-5 char uppercase key"), description: z.string().optional() }, async (params) => textResult(await api("/api/projects", { method: "POST", body: JSON.stringify(params) })));
  server.tool("update_project", "Update a project", { id: z.string(), name: z.string().optional(), description: z.string().optional(), makerMode: z.boolean().optional() }, async ({ id, ...data }) => textResult(await api(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) })));
  server.tool("delete_project", "Delete a project", { id: z.string() }, async ({ id }) => textResult(await api(`/api/projects/${id}`, { method: "DELETE" })));

  // --- Organizations ---
  server.tool("list_orgs", "List organizations", {}, async () => textResult(await api("/api/orgs")));
  server.tool("create_org", "Create an organization", { name: z.string(), slug: z.string() }, async (params) => textResult(await api("/api/orgs", { method: "POST", body: JSON.stringify(params) })));
  server.tool("update_org", "Update an organization", { orgId: z.string(), name: z.string().optional(), slug: z.string().optional() }, async ({ orgId, ...data }) => textResult(await api(`/api/orgs/${orgId}`, { method: "PATCH", body: JSON.stringify(data) })));
  server.tool("list_org_members", "List org members", { orgId: z.string() }, async ({ orgId }) => textResult(await api(`/api/orgs/${orgId}/members`)));
  server.tool("add_org_member", "Add org member", { orgId: z.string(), userId: z.string(), role: z.enum(["admin", "member", "viewer", "guest"]).optional() }, async ({ orgId, ...data }) => textResult(await api(`/api/orgs/${orgId}/members`, { method: "POST", body: JSON.stringify(data) })));
  server.tool("update_org_member", "Update org member role", { orgId: z.string(), memberId: z.string(), role: z.enum(["admin", "member", "viewer", "guest"]) }, async ({ orgId, memberId, ...data }) => textResult(await api(`/api/orgs/${orgId}/members/${memberId}`, { method: "PATCH", body: JSON.stringify(data) })));
  server.tool("remove_org_member", "Remove org member", { orgId: z.string(), memberId: z.string() }, async ({ orgId, memberId }) => textResult(await api(`/api/orgs/${orgId}/members/${memberId}`, { method: "DELETE" })));

  // --- Teams ---
  server.tool("list_teams", "List teams in an org", { orgId: z.string() }, async ({ orgId }) => textResult(await api(`/api/orgs/${orgId}/teams`)));
  server.tool("create_team", "Create a team", { orgId: z.string(), name: z.string(), description: z.string().optional() }, async ({ orgId, ...data }) => textResult(await api(`/api/orgs/${orgId}/teams`, { method: "POST", body: JSON.stringify(data) })));
  server.tool("update_team", "Update a team", { orgId: z.string(), teamId: z.string(), name: z.string().optional(), description: z.string().optional() }, async ({ orgId, teamId, ...data }) => textResult(await api(`/api/orgs/${orgId}/teams/${teamId}`, { method: "PATCH", body: JSON.stringify(data) })));
  server.tool("delete_team", "Delete a team", { orgId: z.string(), teamId: z.string() }, async ({ orgId, teamId }) => textResult(await api(`/api/orgs/${orgId}/teams/${teamId}`, { method: "DELETE" })));
  server.tool("list_team_members", "List team members", { orgId: z.string(), teamId: z.string() }, async ({ orgId, teamId }) => textResult(await api(`/api/orgs/${orgId}/teams/${teamId}/members`)));
  server.tool("add_team_member", "Add team member", { orgId: z.string(), teamId: z.string(), userId: z.string(), role: z.enum(["lead", "member"]).optional() }, async ({ orgId, teamId, ...data }) => textResult(await api(`/api/orgs/${orgId}/teams/${teamId}/members`, { method: "POST", body: JSON.stringify(data) })));
  server.tool("update_team_member", "Update team member role", { orgId: z.string(), teamId: z.string(), memberId: z.string(), role: z.enum(["lead", "member"]) }, async ({ orgId, teamId, memberId, ...data }) => textResult(await api(`/api/orgs/${orgId}/teams/${teamId}/members/${memberId}`, { method: "PATCH", body: JSON.stringify(data) })));
  server.tool("remove_team_member", "Remove team member", { orgId: z.string(), teamId: z.string(), memberId: z.string() }, async ({ orgId, teamId, memberId }) => textResult(await api(`/api/orgs/${orgId}/teams/${teamId}/members/${memberId}`, { method: "DELETE" })));
  server.tool("grant_team_project_access", "Grant team project access", { orgId: z.string(), teamId: z.string(), projectId: z.string() }, async ({ orgId, teamId, ...data }) => textResult(await api(`/api/orgs/${orgId}/teams/${teamId}/projects`, { method: "POST", body: JSON.stringify(data) })));
  server.tool("revoke_team_project_access", "Revoke team project access", { orgId: z.string(), teamId: z.string(), projectId: z.string() }, async ({ orgId, teamId, ...data }) => textResult(await api(`/api/orgs/${orgId}/teams/${teamId}/projects`, { method: "DELETE", body: JSON.stringify(data) })));

  // --- Work Items ---
  server.tool("list_work_items", "List work items with filters", { projectId: z.string().optional(), type: z.enum(["epic", "feature", "story", "bug", "task", "idea"]).optional(), state: z.string().optional(), sprintId: z.string().optional(), parentId: z.string().optional(), query: z.string().optional() }, async (params) => { const qs = new URLSearchParams(); for (const [k, v] of Object.entries(params)) { if (v) qs.set(k === "query" ? "q" : k, String(v)); } return textResult(await api(`/api/work-items?${qs}`)); });
  server.tool("get_work_item", "Get work item by displayId like 'STRI-5'", { id: z.string() }, async ({ id }) => textResult(await api(`/api/work-items/${id}`)));
  server.tool("create_work_item", "Create a work item", { projectId: z.string(), title: z.string(), type: z.enum(["epic", "feature", "story", "bug", "task", "idea"]), description: z.string().optional(), parentId: z.string().optional(), sprintId: z.string().optional(), assignee: z.string().optional(), state: z.string().optional(), points: z.number().nullable().optional(), priority: z.number().optional() }, async (params) => textResult(await api("/api/work-items", { method: "POST", body: JSON.stringify(params) })));
  server.tool("update_work_item", "Update a work item", { id: z.string(), title: z.string().optional(), type: z.enum(["epic", "feature", "story", "bug", "task", "idea"]).optional(), state: z.string().optional(), description: z.string().optional(), parentId: z.string().nullable().optional(), sprintId: z.string().nullable().optional(), assignee: z.string().nullable().optional(), points: z.number().nullable().optional(), priority: z.number().optional() }, async ({ id, ...data }) => textResult(await api(`/api/work-items/${id}`, { method: "PATCH", body: JSON.stringify(data) })));
  server.tool("delete_work_item", "Delete a work item", { id: z.string() }, async ({ id }) => textResult(await api(`/api/work-items/${id}`, { method: "DELETE" })));

  // --- Attachments ---
  server.tool("list_attachments", "List attachments", { workItemId: z.string() }, async ({ workItemId }) => textResult(await api(`/api/work-items/${workItemId}/attachments`)));
  server.tool("delete_attachment", "Delete an attachment", { attachmentId: z.string() }, async ({ attachmentId }) => textResult(await api(`/api/attachments/${attachmentId}`, { method: "DELETE" })));

  // --- Comments ---
  server.tool("list_comments", "List comments", { workItemId: z.string() }, async ({ workItemId }) => textResult(await api(`/api/work-items/${workItemId}/comments`)));
  server.tool("add_comment", "Add a comment", { workItemId: z.string(), body: z.string() }, async ({ workItemId, ...data }) => textResult(await api(`/api/work-items/${workItemId}/comments`, { method: "POST", body: JSON.stringify(data) })));

  // --- History & Versions ---
  server.tool("get_status_history", "Get status change history", { workItemId: z.string() }, async ({ workItemId }) => textResult(await api(`/api/work-items/${workItemId}/history`)));
  server.tool("get_work_item_versions", "Get all versions/snapshots", { workItemId: z.string() }, async ({ workItemId }) => textResult(await api(`/api/work-items/${workItemId}/versions`)));
  server.tool("restore_work_item_version", "Restore to a previous version", { workItemId: z.string(), version: z.number() }, async ({ workItemId, ...data }) => textResult(await api(`/api/work-items/${workItemId}/restore`, { method: "POST", body: JSON.stringify(data) })));

  // --- Hierarchy ---
  server.tool("get_hierarchy", "Get epic > feature > story tree", { projectId: z.string() }, async ({ projectId }) => textResult(await api(`/api/hierarchy?projectId=${projectId}`)));

  // --- Sprints ---
  server.tool("list_sprints", "List sprints", { projectId: z.string().optional(), state: z.enum(["planning", "active", "closed"]).optional() }, async (params) => { const qs = new URLSearchParams(); if (params.projectId) qs.set("projectId", params.projectId); if (params.state) qs.set("state", params.state); return textResult(await api(`/api/sprints?${qs}`)); });
  server.tool("create_sprint", "Create a sprint", { projectId: z.string(), name: z.string(), goal: z.string().optional(), startDate: z.string().optional(), endDate: z.string().optional() }, async (params) => textResult(await api("/api/sprints", { method: "POST", body: JSON.stringify(params) })));
  server.tool("update_sprint", "Update a sprint", { id: z.string(), name: z.string().optional(), goal: z.string().nullable().optional(), state: z.enum(["planning", "active", "closed"]).optional(), startDate: z.string().nullable().optional(), endDate: z.string().nullable().optional() }, async ({ id, ...data }) => textResult(await api(`/api/sprints/${id}`, { method: "PATCH", body: JSON.stringify(data) })));

  // --- TraQL ---
  server.tool("run_traql", "Run a TraQL query", { query: z.string(), projectId: z.string().optional() }, async (params) => textResult(await api("/api/traql", { method: "POST", body: JSON.stringify(params) })));

  // --- Workflow ---
  server.tool("get_workflow", "Get workflow states", { projectId: z.string() }, async ({ projectId }) => textResult(await api(`/api/projects/${projectId}/workflow`)));
  server.tool("add_workflow_state", "Add workflow state", { projectId: z.string(), displayName: z.string(), category: z.enum(["todo", "in_progress", "done"]), color: z.string().optional() }, async ({ projectId, ...data }) => textResult(await api(`/api/projects/${projectId}/workflow`, { method: "POST", body: JSON.stringify(data) })));
  server.tool("update_workflow_state", "Update workflow state", { projectId: z.string(), stateId: z.string(), displayName: z.string().optional(), category: z.enum(["todo", "in_progress", "done"]).optional(), color: z.string().optional() }, async ({ projectId, stateId, ...data }) => textResult(await api(`/api/projects/${projectId}/workflow/${stateId}`, { method: "PATCH", body: JSON.stringify(data) })));
  server.tool("delete_workflow_state", "Delete workflow state", { projectId: z.string(), stateId: z.string(), migrateToSlug: z.string().optional() }, async ({ projectId, stateId, ...data }) => textResult(await api(`/api/projects/${projectId}/workflow/${stateId}`, { method: "DELETE", body: JSON.stringify(data) })));

  // --- Links ---
  server.tool("list_links", "List work item links", { workItemId: z.string() }, async ({ workItemId }) => textResult(await api(`/api/work-items/${workItemId}/links`)));
  server.tool("create_link", "Create a link between work items", { workItemId: z.string(), targetId: z.string(), type: z.enum(["blocks", "blocked_by", "relates_to", "duplicates"]) }, async ({ workItemId, ...data }) => textResult(await api(`/api/work-items/${workItemId}/links`, { method: "POST", body: JSON.stringify(data) })));
  server.tool("delete_link", "Delete a work item link", { workItemId: z.string(), linkId: z.string() }, async ({ workItemId, linkId }) => textResult(await api(`/api/work-items/${workItemId}/links/${linkId}`, { method: "DELETE" })));

  // --- Saved Queries ---
  server.tool("list_saved_queries", "List saved queries", { projectId: z.string() }, async ({ projectId }) => textResult(await api(`/api/saved-queries?projectId=${projectId}`)));
  server.tool("save_query", "Save a TraQL query", { projectId: z.string(), name: z.string(), query: z.string() }, async (params) => textResult(await api("/api/saved-queries", { method: "POST", body: JSON.stringify(params) })));
  server.tool("update_saved_query", "Update a saved query", { id: z.string(), name: z.string().optional(), query: z.string().optional(), starred: z.boolean().optional(), shared: z.boolean().optional() }, async ({ id, ...data }) => textResult(await api(`/api/saved-queries/${id}`, { method: "PATCH", body: JSON.stringify(data) })));
  server.tool("delete_saved_query", "Delete a saved query", { id: z.string() }, async ({ id }) => textResult(await api(`/api/saved-queries/${id}`, { method: "DELETE" })));

  // --- Account ---
  server.tool("update_profile", "Update display name", { name: z.string() }, async (params) => textResult(await api("/api/account", { method: "PATCH", body: JSON.stringify(params) })));
  server.tool("list_api_keys", "List API keys", {}, async () => textResult(await api("/api/account/keys")));
  server.tool("create_api_key", "Generate a new API key", { label: z.string() }, async (params) => textResult(await api("/api/account/keys", { method: "POST", body: JSON.stringify(params) })));
  server.tool("revoke_api_key", "Revoke an API key", { id: z.string() }, async (params) => textResult(await api("/api/account/keys", { method: "DELETE", body: JSON.stringify(params) })));

  return server;
}

async function handleMcpRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const apiKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Unauthorized — pass API key as Bearer token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Construct the base URL from the request
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const server = createServer(baseUrl, apiKey);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless mode
    enableJsonResponse: true,
  });

  await server.connect(transport);
  const response = await transport.handleRequest(request as unknown as Request);
  return response;
}

export async function GET(request: NextRequest) {
  return handleMcpRequest(request);
}

export async function POST(request: NextRequest) {
  return handleMcpRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleMcpRequest(request);
}
