// Test setup: seed test data into Neon test branch
// Same Postgres as production, but isolated branch for test data

import { beforeAll } from "vitest";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { seedTestData } from "./seed-traql";

beforeAll(async () => {
  // Check if test seed data actually exists (look for ALP-prefixed work items, not just the project key)
  // Also check for v2 seed data (status_history, blocks links) to detect stale seed
  const existing = await db.select().from(schema.workItems).where(eq(schema.workItems.title, "ALP-Epic-0: Authentication"));
  const historyExists = await db.select().from(schema.statusHistory).where(eq(schema.statusHistory.workItemId, 3));
  const githubEventsExist = await db.select().from(schema.githubEvents).where(eq(schema.githubEvents.workItemId, 3));
  if (existing.length === 0 || historyExists.length === 0 || githubEventsExist.length === 0) {
    console.log("Seeding test data (cleaning stale data first)...");
    // Clean ALL data from the test branch — it's dedicated to test runs
    // Order matters due to FK constraints: children before parents
    await db.execute(sql`DELETE FROM github_events`);
    await db.execute(sql`DELETE FROM work_item_links`);
    await db.execute(sql`DELETE FROM work_item_snapshots`);
    await db.execute(sql`DELETE FROM status_history`);
    await db.execute(sql`DELETE FROM comments`);
    await db.execute(sql`DELETE FROM attachments`);
    await db.execute(sql`DELETE FROM saved_queries`);
    await db.execute(sql`DELETE FROM work_items`);
    await db.execute(sql`DELETE FROM sprints`);
    await db.execute(sql`DELETE FROM workflow_states`);
    await db.execute(sql`DELETE FROM project_invites`);
    await db.execute(sql`DELETE FROM projects`);
    // Reset sequences so serial IDs start from 1
    await db.execute(sql`ALTER SEQUENCE projects_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE sprints_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE work_items_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE work_item_links_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE workflow_states_id_seq RESTART WITH 1`);
    await seedTestData(db);
    // Advance sequences past the seeded IDs to prevent conflicts
    await db.execute(sql`SELECT setval('projects_id_seq', (SELECT COALESCE(MAX(id), 1) FROM projects))`);
    await db.execute(sql`SELECT setval('sprints_id_seq', (SELECT COALESCE(MAX(id), 1) FROM sprints))`);
    await db.execute(sql`SELECT setval('work_items_id_seq', (SELECT COALESCE(MAX(id), 1) FROM work_items))`);
    await db.execute(sql`SELECT setval('work_item_links_id_seq', (SELECT COALESCE(MAX(id), 1) FROM work_item_links))`);
    await db.execute(sql`SELECT setval('workflow_states_id_seq', (SELECT COALESCE(MAX(id), 1) FROM workflow_states))`);
    await db.execute(sql`SELECT setval('status_history_id_seq', (SELECT COALESCE(MAX(id), 1) FROM status_history))`);
    await db.execute(sql`SELECT setval('work_item_snapshots_id_seq', (SELECT COALESCE(MAX(id), 1) FROM work_item_snapshots))`);
    await db.execute(sql`SELECT setval('github_events_id_seq', (SELECT COALESCE(MAX(id), 1) FROM github_events))`);
    console.log("Test data seeded.");
  }

  // Ensure sprint states match seed data (tests may have mutated them)
  await db.update(schema.sprints).set({ state: "closed" }).where(eq(schema.sprints.id, 1));
  await db.update(schema.sprints).set({ state: "closed" }).where(eq(schema.sprints.id, 2));
  await db.update(schema.sprints).set({ state: "active" }).where(eq(schema.sprints.id, 3));
  await db.update(schema.sprints).set({ state: "planning" }).where(eq(schema.sprints.id, 4));
  await db.update(schema.sprints).set({ state: "active" }).where(eq(schema.sprints.id, 5));
  await db.update(schema.sprints).set({ state: "planning" }).where(eq(schema.sprints.id, 6));

  // Ensure test user
  const existingUser = await db.select().from(schema.users).where(eq(schema.users.id, "test-user"));
  if (existingUser.length === 0) {
    await db.insert(schema.users).values({ id: "test-user", name: "Test User", email: "test@example.com" });
  }
}, 120000);
