/**
 * Drizzle ORM schema for Stori.
 *
 * Deletion cascades (all enforced at the Postgres FK level):
 *
 *   organization DELETE → cascades: organization_members, organization_invitations,
 *                         org_roles
 *   organization DELETE → SET NULL: projects.orgId
 *   project DELETE → cascades: work_items, sprints, workflow_states,
 *                    saved_queries
 *   work_item DELETE → cascades: snapshots, comments, attachments,
 *                      status_history, links
 *   work_item DELETE → SET NULL: children's parentId
 *   team DELETE → cascades: team_members, team_project_access
 *   project DELETE → cascades: github_automations, github_events,
 *                    team_project_access
 *   work_item DELETE → cascades: github_events (nullable FK)
 *
 * No app-side cascade logic is needed — route handlers just delete
 * the parent row and Postgres handles the rest.
 */
import { pgTable, text, integer, boolean, timestamp, customType, type AnyPgColumn } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

const bytea = customType<{ data: Buffer }>({
  dataType() { return "bytea"; },
});

// --- Auth.js tables ---

export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull().unique(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// --- Organization tables ---

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").notNull().default("free"), // free, developer, team, enterprise
  ownerId: text("owner_id").notNull().references(() => users.id),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const organizationMembers = pgTable("organization_members", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"), // owner, admin, member, viewer, guest
  joinedAt: text("joined_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const organizationInvitations = pgTable("organization_invitations", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const orgRoles = pgTable("org_roles", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  permissions: text("permissions").notNull(), // JSON string of permission array
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const teams = pgTable("teams", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const teamMembers = pgTable("team_members", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  teamId: text("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"), // lead, member
  joinedAt: text("joined_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const teamProjectAccess = pgTable("team_project_access", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  teamId: text("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
});

// --- Audit log ---

export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  actorName: text("actor_name"), // denormalized for when user is deleted
  action: text("action").notNull(), // e.g. "member.invited", "project.created", "role.updated"
  targetType: text("target_type"), // "member", "project", "team", "role", "settings"
  targetId: text("target_id"),
  description: text("description").notNull(),
  ipAddress: text("ip_address"),
  projectId: text("project_id"),
  metadata: text("metadata"), // JSON for extra context
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// --- Security tables ---

export const ssoConfigurations = pgTable("sso_configurations", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  protocol: text("protocol").notNull(), // "saml" or "oidc"
  entityId: text("entity_id"),
  metadataUrl: text("metadata_url"),
  clientId: text("client_id"),
  clientSecret: text("client_secret"), // OIDC client secret (encrypted at rest by Neon)
  discoveryUrl: text("discovery_url"),
  certificate: text("certificate"),
  enforced: boolean("enforced").notNull().default(false),
  scimTokenHash: text("scim_token_hash"), // SHA-256 hash of the SCIM bearer token
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const verifiedDomains = pgTable("verified_domains", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  domain: text("domain").notNull(),
  status: text("status").notNull().default("pending"), // "pending", "verified"
  verificationToken: text("verification_token").notNull(),
  requireSso: boolean("require_sso").notNull().default(false),
  blockMagicLink: boolean("block_magic_link").notNull().default(false),
  autoCapture: boolean("auto_capture").notNull().default(false),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const ipAllowlist = pgTable("ip_allowlist", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  cidr: text("cidr").notNull(),
  description: text("description"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// --- App tables ---

export const projects = pgTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  key: text("key").notNull().unique(),
  description: text("description").default(""),
  ownerId: text("owner_id"),
  sequence: integer("sequence").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  githubOwner: text("github_owner"),
  githubRepo: text("github_repo"),
  githubWebhookSecret: text("github_webhook_secret"),
  githubStatusChecks: boolean("github_status_checks").notNull().default(true),
  githubPrComments: boolean("github_pr_comments").notNull().default(true),
  makerMode: boolean("maker_mode").notNull().default(false),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "set null" }),
});

export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  label: text("label").notNull(),
  lastUsedAt: text("last_used_at"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const deviceCodes = pgTable("device_codes", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  code: text("code").notNull().unique(),
  userId: text("user_id"),
  apiKey: text("api_key"),
  status: text("status").notNull().default("pending"),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const workflowStates = pgTable("workflow_states", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  displayName: text("display_name").notNull(),
  position: integer("position").notNull().default(0),
  category: text("category").notNull(),
  color: text("color").notNull().default("#9CA3AF"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const workItems = pgTable("work_items", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  displayId: text("display_id").unique(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull(),
  state: text("state")
    .notNull()
    .default("new"),
  description: text("description").default(""),
  parentId: text("parent_id").references((): AnyPgColumn => workItems.id, { onDelete: "set null" }),
  sprintId: text("sprint_id").references(() => sprints.id, { onDelete: "set null" }),
  assignee: text("assignee"),
  points: integer("points"),
  priority: integer("priority").default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  canvasX: integer("canvas_x"),
  canvasY: integer("canvas_y"),
  canvasColor: text("canvas_color"),
});

export const workItemSnapshots = pgTable("work_item_snapshots", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  workItemId: text("work_item_id")
    .notNull()
    .references(() => workItems.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  snapshot: text("snapshot").notNull(),
  changedBy: text("changed_by"),
  channel: text("channel").default("api"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const sprints = pgTable("sprints", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  goal: text("goal"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  state: text("state")
    .notNull()
    .default("planning"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const attachments = pgTable("attachments", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  workItemId: text("work_item_id")
    .notNull()
    .references(() => workItems.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  data: bytea("data").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const statusHistory = pgTable("status_history", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  workItemId: text("work_item_id")
    .notNull()
    .references(() => workItems.id, { onDelete: "cascade" }),
  fromState: text("from_state").notNull(),
  toState: text("to_state").notNull(),
  changedAt: text("changed_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const workItemLinks = pgTable("work_item_links", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  sourceId: text("source_id")
    .notNull()
    .references(() => workItems.id, { onDelete: "cascade" }),
  targetId: text("target_id")
    .notNull()
    .references(() => workItems.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const savedQueries = pgTable("saved_queries", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  query: text("query").notNull(),
  starred: boolean("starred").notNull().default(false),
  shared: boolean("shared").notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const comments = pgTable("comments", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  workItemId: text("work_item_id")
    .notNull()
    .references(() => workItems.id, { onDelete: "cascade" }),
  author: text("author").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const githubAutomations = pgTable("github_automations", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  event: text("event").notNull(), // "pr_opened", "pr_merged", "pr_closed", "deploy_succeeded", "deploy_failed"
  targetStateId: text("target_state_id")
    .notNull()
    .references(() => workflowStates.id),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const githubEvents = pgTable("github_events", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  workItemId: text("work_item_id")
    .references(() => workItems.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  action: text("action"),
  prNumber: integer("pr_number"),
  prTitle: text("pr_title"),
  prState: text("pr_state"),
  branch: text("branch"),
  sha: text("sha"),
  ciStatus: text("ci_status"),
  payload: text("payload"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// --- Platform admin tables ---

export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});
