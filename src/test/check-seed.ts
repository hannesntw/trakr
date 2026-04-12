import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";
import * as schema from "../db/schema";
import { seedTestData } from "./seed-traql";

async function main() {
  const client = createClient({ url: "file:./test-check.db" });
  const db = drizzle(client, { schema });

  // Create tables
  const ddl = `
    CREATE TABLE IF NOT EXISTS "projects" ("id" integer PRIMARY KEY AUTOINCREMENT, "name" text NOT NULL, "key" text NOT NULL UNIQUE, "description" text DEFAULT '', "visibility" text NOT NULL DEFAULT 'public', "owner_id" text, "created_at" text NOT NULL, "updated_at" text NOT NULL);
    CREATE TABLE IF NOT EXISTS "workflow_states" ("id" integer PRIMARY KEY AUTOINCREMENT, "project_id" integer NOT NULL, "slug" text NOT NULL, "display_name" text NOT NULL, "position" integer NOT NULL DEFAULT 0, "category" text NOT NULL, "color" text NOT NULL DEFAULT '#9CA3AF', "created_at" text NOT NULL);
    CREATE TABLE IF NOT EXISTS "work_items" ("id" integer PRIMARY KEY AUTOINCREMENT, "project_id" integer NOT NULL, "title" text NOT NULL, "type" text NOT NULL, "state" text NOT NULL DEFAULT 'new', "description" text DEFAULT '', "parent_id" integer, "sprint_id" integer, "assignee" text, "points" integer, "priority" integer DEFAULT 0, "created_at" text NOT NULL, "updated_at" text NOT NULL);
    CREATE TABLE IF NOT EXISTS "sprints" ("id" integer PRIMARY KEY AUTOINCREMENT, "project_id" integer NOT NULL, "name" text NOT NULL, "goal" text, "start_date" text, "end_date" text, "state" text NOT NULL DEFAULT 'planning', "created_at" text NOT NULL);
    CREATE TABLE IF NOT EXISTS "work_item_links" ("id" integer PRIMARY KEY AUTOINCREMENT, "source_id" integer NOT NULL, "target_id" integer NOT NULL, "type" text NOT NULL, "created_at" text NOT NULL);
    CREATE TABLE IF NOT EXISTS "saved_queries" ("id" integer PRIMARY KEY AUTOINCREMENT, "project_id" integer NOT NULL, "user_id" text NOT NULL, "name" text NOT NULL, "query" text NOT NULL, "starred" integer NOT NULL DEFAULT 0, "shared" integer NOT NULL DEFAULT 0, "created_at" text NOT NULL);
    CREATE TABLE IF NOT EXISTS "project_invites" ("id" integer PRIMARY KEY AUTOINCREMENT, "project_id" integer NOT NULL, "email" text NOT NULL, "created_at" text NOT NULL);
  `;
  for (const stmt of ddl.split(";").map(s => s.trim()).filter(Boolean)) {
    await db.run(sql.raw(stmt));
  }

  await seedTestData(db);

  const counts = await db.all<{ project_id: number; cnt: number }>(sql`SELECT project_id, COUNT(*) as cnt FROM work_items GROUP BY project_id`);
  console.log("\n=== Items per project ===");
  for (const r of counts) console.log(`  Project ${r.project_id}: ${r.cnt} items`);

  const types = await db.all<{ project_id: number; type: string; cnt: number }>(sql`SELECT project_id, type, COUNT(*) as cnt FROM work_items GROUP BY project_id, type ORDER BY project_id, type`);
  console.log("\n=== Types ===");
  for (const r of types) console.log(`  Project ${r.project_id} ${r.type}: ${r.cnt}`);

  const states = await db.all<{ project_id: number; state: string; cnt: number }>(sql`SELECT project_id, state, COUNT(*) as cnt FROM work_items GROUP BY project_id, state ORDER BY project_id, state`);
  console.log("\n=== States ===");
  for (const r of states) console.log(`  Project ${r.project_id} ${r.state}: ${r.cnt}`);

  const depths = await db.all<{ depth: number; cnt: number }>(sql`
    WITH RECURSIVE tree AS (
      SELECT id, parent_id, 0 as depth FROM work_items WHERE parent_id IS NULL
      UNION ALL
      SELECT w.id, w.parent_id, t.depth + 1 FROM work_items w JOIN tree t ON w.parent_id = t.id
    )
    SELECT depth, COUNT(*) as cnt FROM tree GROUP BY depth ORDER BY depth
  `);
  console.log("\n=== Depth distribution ===");
  for (const r of depths) console.log(`  Level ${r.depth}: ${r.cnt} items`);

  const maxChildren = await db.all<{ parent_id: number; cnt: number }>(sql`SELECT parent_id, COUNT(*) as cnt FROM work_items WHERE parent_id IS NOT NULL GROUP BY parent_id ORDER BY cnt DESC LIMIT 5`);
  console.log("\n=== Top parents by child count ===");
  for (const r of maxChildren) console.log(`  #${r.parent_id}: ${r.cnt} children`);

  const links = await db.all<{ cnt: number }>(sql`SELECT COUNT(*) as cnt FROM work_item_links`);
  console.log(`\n=== Links: ${links[0].cnt} ===`);

  const unassigned = await db.all<{ cnt: number }>(sql`SELECT COUNT(*) as cnt FROM work_items WHERE assignee IS NULL`);
  console.log(`=== Unassigned: ${unassigned[0].cnt} ===`);

  const unsprinted = await db.all<{ cnt: number }>(sql`SELECT COUNT(*) as cnt FROM work_items WHERE sprint_id IS NULL`);
  console.log(`=== Unsprinted: ${unsprinted[0].cnt} ===`);

  // Clean up
  const { unlinkSync } = await import("fs");
  unlinkSync("./test-check.db");
}

main().catch(console.error);
