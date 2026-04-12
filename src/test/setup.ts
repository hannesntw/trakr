// Test setup: create test.db with schema and seed data
// Runs once before all test files via vitest setupFiles

import { beforeAll, afterAll } from "vitest";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { seedTestData } from "./seed-traql";

let seeded = false;

beforeAll(async () => {
  if (seeded) return;

  // Create tables (IF NOT EXISTS for idempotency across forks)
  const ddl = `
    CREATE TABLE IF NOT EXISTS "user" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text,
      "email" text UNIQUE,
      "emailVerified" integer,
      "image" text
    );
    CREATE TABLE IF NOT EXISTS "projects" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "name" text NOT NULL,
      "key" text NOT NULL UNIQUE,
      "description" text DEFAULT '',
      "visibility" text NOT NULL DEFAULT 'public',
      "owner_id" text,
      "created_at" text NOT NULL,
      "updated_at" text NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "workflow_states" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "project_id" integer NOT NULL,
      "slug" text NOT NULL,
      "display_name" text NOT NULL,
      "position" integer NOT NULL DEFAULT 0,
      "category" text NOT NULL,
      "color" text NOT NULL DEFAULT '#9CA3AF',
      "created_at" text NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "work_items" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "project_id" integer NOT NULL,
      "title" text NOT NULL,
      "type" text NOT NULL,
      "state" text NOT NULL DEFAULT 'new',
      "description" text DEFAULT '',
      "parent_id" integer,
      "sprint_id" integer,
      "assignee" text,
      "points" integer,
      "priority" integer DEFAULT 0,
      "created_at" text NOT NULL,
      "updated_at" text NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "sprints" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "project_id" integer NOT NULL,
      "name" text NOT NULL,
      "goal" text,
      "start_date" text,
      "end_date" text,
      "state" text NOT NULL DEFAULT 'planning',
      "created_at" text NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "work_item_links" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "source_id" integer NOT NULL,
      "target_id" integer NOT NULL,
      "type" text NOT NULL,
      "created_at" text NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "saved_queries" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "project_id" integer NOT NULL,
      "user_id" text NOT NULL,
      "name" text NOT NULL,
      "query" text NOT NULL,
      "starred" integer NOT NULL DEFAULT 0,
      "shared" integer NOT NULL DEFAULT 0,
      "created_at" text NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "project_invites" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "project_id" integer NOT NULL,
      "email" text NOT NULL,
      "created_at" text NOT NULL
    );
  `;

  // Execute DDL statements one by one
  for (const stmt of ddl.split(";").map(s => s.trim()).filter(Boolean)) {
    await db.run(sql.raw(stmt));
  }

  // Check if already seeded (idempotent)
  const [row] = await db.all(sql`SELECT COUNT(*) as cnt FROM projects`);
  if ((row as any).cnt === 0) {
    await seedTestData(db);
  }

  seeded = true;
}, 30000);
