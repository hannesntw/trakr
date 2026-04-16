// Test setup: seed test data into Neon test branch
// Same Postgres as production, but isolated branch for test data

import { beforeAll } from "vitest";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { seedTestData } from "./seed-traql";

beforeAll(async () => {
  // Check if test seed data actually exists (look for ALP project by key)
  // Also check for v2 seed data (status_history, blocks links) to detect stale seed
  const existing = await db.select().from(schema.projects).where(eq(schema.projects.key, "ALP"));
  const historyExists = await db.select().from(schema.statusHistory).where(eq(schema.statusHistory.workItemId, "test-wi-3"));
  const githubEventsExist = await db.select().from(schema.githubEvents).where(eq(schema.githubEvents.workItemId, "test-wi-3"));
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
    await db.execute(sql`DELETE FROM projects`);
    await seedTestData(db);
    console.log("Test data seeded.");
  }

  // Ensure sprint states match seed data (tests may have mutated them)
  await db.update(schema.sprints).set({ state: "closed" }).where(eq(schema.sprints.id, "test-sprint-1"));
  await db.update(schema.sprints).set({ state: "closed" }).where(eq(schema.sprints.id, "test-sprint-2"));
  await db.update(schema.sprints).set({ state: "active" }).where(eq(schema.sprints.id, "test-sprint-3"));
  await db.update(schema.sprints).set({ state: "planning" }).where(eq(schema.sprints.id, "test-sprint-4"));
  await db.update(schema.sprints).set({ state: "active" }).where(eq(schema.sprints.id, "test-sprint-5"));
  await db.update(schema.sprints).set({ state: "planning" }).where(eq(schema.sprints.id, "test-sprint-6"));

  // Ensure test user
  const existingUser = await db.select().from(schema.users).where(eq(schema.users.id, "test-user"));
  if (existingUser.length === 0) {
    await db.insert(schema.users).values({ id: "test-user", name: "Test User", email: "test@example.com" });
  }
}, 120000);
