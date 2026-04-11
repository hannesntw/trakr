import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";

// --- Auth.js tables ---

export const users = sqliteTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp" }),
  image: text("image"),
});

export const accounts = sqliteTable("account", {
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

export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

export const verificationTokens = sqliteTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull().unique(),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

// --- App tables ---

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  key: text("key").notNull().unique(),
  description: text("description").default(""),
  visibility: text("visibility", { enum: ["public", "private"] }).notNull().default("public"),
  ownerId: text("owner_id"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const apiKeys = sqliteTable("api_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(), // first 8 chars for display
  label: text("label").notNull(),
  lastUsedAt: text("last_used_at"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const deviceCodes = sqliteTable("device_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  userId: text("user_id"),
  apiKey: text("api_key"), // raw key stored temporarily until polled once
  status: text("status", { enum: ["pending", "authorized", "expired"] }).notNull().default("pending"),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const projectInvites = sqliteTable("project_invites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => projects.id),
  email: text("email").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const workItems = sqliteTable("work_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  title: text("title").notNull(),
  type: text("type", { enum: ["epic", "feature", "story", "bug", "task"] }).notNull(),
  state: text("state", {
    enum: ["new", "active", "ready", "in_progress", "done"],
  })
    .notNull()
    .default("new"),
  description: text("description").default(""),
  parentId: integer("parent_id"),
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

export const workItemSnapshots = sqliteTable("work_item_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workItemId: integer("work_item_id")
    .notNull()
    .references(() => workItems.id),
  version: integer("version").notNull(),
  snapshot: text("snapshot").notNull(), // JSON blob of all fields
  changedBy: text("changed_by"),
  channel: text("channel", { enum: ["web", "api", "mcp"] }).default("api"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const sprints = sqliteTable("sprints", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  name: text("name").notNull(),
  goal: text("goal"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  state: text("state", { enum: ["planning", "active", "closed"] })
    .notNull()
    .default("planning"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const attachments = sqliteTable("attachments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workItemId: integer("work_item_id")
    .notNull()
    .references(() => workItems.id),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  data: blob("data", { mode: "buffer" }).notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const statusHistory = sqliteTable("status_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workItemId: integer("work_item_id")
    .notNull()
    .references(() => workItems.id),
  fromState: text("from_state").notNull(),
  toState: text("to_state").notNull(),
  changedAt: text("changed_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workItemId: integer("work_item_id")
    .notNull()
    .references(() => workItems.id),
  author: text("author").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
