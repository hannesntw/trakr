// Test setup: seed test data into Neon test branch
// Same Postgres as production, but isolated branch for test data

import { beforeAll } from "vitest";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { seedTestData } from "./seed-traql";

beforeAll(async () => {
  // Check if test data already exists (idempotent)
  const existing = await db.select().from(schema.projects).where(eq(schema.projects.key, "ALP"));
  if (existing.length === 0) {
    console.log("Seeding test data...");
    await seedTestData(db);
    console.log("Test data seeded.");
  }

  // Ensure test user
  const existingUser = await db.select().from(schema.users).where(eq(schema.users.id, "test-user"));
  if (existingUser.length === 0) {
    await db.insert(schema.users).values({ id: "test-user", name: "Test User", email: "test@example.com" });
  }
}, 120000);
