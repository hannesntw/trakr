/**
 * Drizzle ORM schema for Trakr.
 *
 * Deletion cascades (all enforced at the Postgres FK level):
 *
 *   project DELETE → cascades: work_items, sprints, workflow_states,
 *                    saved_queries, project_invites
 *   work_item DELETE → cascades: snapshots, comments, attachments,
 *                      status_history, links
 *   work_item DELETE → SET NULL: children's parentId
 *   project DELETE → cascades: github_automations, github_events
 *   work_item DELETE → cascades: github_events (nullable FK)
 *
 * No app-side cascade logic is needed — route handlers just delete
 * the parent row and Postgres handles the rest.
 */
import { pgTable, text, integer, serial, boolean, timestamp, customType, type AnyPgColumn } from "drizzle-orm/pg-core";

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

// --- App tables ---

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  key: text("key").notNull().unique(),
  description: text("description").default(""),
  visibility: text("visibility").notNull().default("public"),
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
});

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
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
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  userId: text("user_id"),
  apiKey: text("api_key"),
  status: text("status").notNull().default("pending"),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const projectInvites = pgTable("project_invites", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const workflowStates = pgTable("workflow_states", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
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
  id: serial("id").primaryKey(),
  displayId: text("display_id").unique(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull(),
  state: text("state")
    .notNull()
    .default("new"),
  description: text("description").default(""),
  parentId: integer("parent_id").references((): AnyPgColumn => workItems.id, { onDelete: "set null" }),
  sprintId: integer("sprint_id"),
  assignee: text("assignee"),
  points: integer("points"),
  priority: integer("priority").default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const workItemSnapshots = pgTable("work_item_snapshots", {
  id: serial("id").primaryKey(),
  workItemId: integer("work_item_id")
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
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
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
  id: serial("id").primaryKey(),
  workItemId: integer("work_item_id")
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
  id: serial("id").primaryKey(),
  workItemId: integer("work_item_id")
    .notNull()
    .references(() => workItems.id, { onDelete: "cascade" }),
  fromState: text("from_state").notNull(),
  toState: text("to_state").notNull(),
  changedAt: text("changed_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const workItemLinks = pgTable("work_item_links", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id")
    .notNull()
    .references(() => workItems.id, { onDelete: "cascade" }),
  targetId: integer("target_id")
    .notNull()
    .references(() => workItems.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const savedQueries = pgTable("saved_queries", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
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
  id: serial("id").primaryKey(),
  workItemId: integer("work_item_id")
    .notNull()
    .references(() => workItems.id, { onDelete: "cascade" }),
  author: text("author").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const githubAutomations = pgTable("github_automations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  event: text("event").notNull(), // "pr_opened", "pr_merged", "pr_closed", "deploy_succeeded", "deploy_failed"
  targetStateId: integer("target_state_id")
    .notNull()
    .references(() => workflowStates.id),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const githubEvents = pgTable("github_events", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  workItemId: integer("work_item_id")
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
