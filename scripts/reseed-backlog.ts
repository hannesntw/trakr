/**
 * Reseed TRK project backlog from Product/trakr/Backlog/ markdown files.
 *
 * Usage: npx tsx scripts/reseed-backlog.ts
 * Requires DATABASE_URL in .env.local
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
import { sql as rawSql } from "drizzle-orm";
import {
  projects,
  workItems,
  comments,
  workItemSnapshots,
  attachments,
  statusHistory,
  workItemLinks,
} from "../src/db/schema";
import * as fs from "fs";
import * as path from "path";
// Load .env.local manually (no dotenv dependency)
function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvFile(path.resolve(__dirname, "../.env.local"));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set. Check .env.local");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql);

const BACKLOG_DIR = path.resolve(
  __dirname,
  "../../Product/trakr/Backlog"
);

// ---------- types ----------

interface BacklogItem {
  localId: number;
  title: string;
  type: "epic" | "feature" | "story" | "bug" | "task";
  state: string;
  description: string;
  parentLocalId: number | null; // from directory structure
  filePath: string;
}

// ---------- parsing ----------

function extractLocalId(filename: string): number | null {
  const match = filename.match(/^(\d+)\s*-\s*/);
  return match ? parseInt(match[1], 10) : null;
}

function parseMarkdown(content: string, filePath: string): {
  title: string;
  type: "epic" | "feature" | "story" | "bug" | "task";
  state: string;
} {
  // Title from first # heading
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : path.basename(filePath, ".md");

  // Type from **Type:** line
  const typeMatch = content.match(/\*\*Type:\*\*\s*([^|*\n]+)/);
  let type: "epic" | "feature" | "story" | "bug" | "task" = "story";
  if (typeMatch) {
    const raw = typeMatch[1].trim().toLowerCase();
    if (raw === "epic") type = "epic";
    else if (raw === "feature") type = "feature";
    else if (raw === "user story") type = "story";
    else if (raw === "bug") type = "bug";
    else if (raw === "task") type = "task";
  }

  // State from **State:** line
  const stateMatch = content.match(/\*\*State:\*\*\s*([^|*\n]+)/);
  let state = "done";
  if (stateMatch) {
    const raw = stateMatch[1].trim().toLowerCase();
    if (raw === "done") state = "done";
    else if (raw === "active") state = "active";
    else if (raw === "new") state = "new";
    else if (raw === "in progress" || raw === "in_progress") state = "in_progress";
    else if (raw === "ready") state = "ready";
    else state = raw;
  }

  return { title, type, state };
}

function determineParentLocalId(filePath: string): number | null {
  // The parent is determined by the directory the file sits in.
  // E.g. .../301 - Work Item Management/302 - Create Work Item.md → parent is 301
  // But the folder's own descriptor file (e.g. 301 - Work Item Management.md inside 301 - Work Item Management/)
  // has its parent from the *grandparent* directory.
  const dir = path.dirname(filePath);
  const dirName = path.basename(dir);
  const dirId = extractLocalId(dirName);

  const fileName = path.basename(filePath, ".md");
  const fileId = extractLocalId(fileName);

  if (dirName === "Backlog") {
    // Top-level epic files inside their own epic folder
    return null;
  }

  // If the file's ID matches the directory's ID, this is the folder descriptor.
  // Its parent comes from the grandparent directory.
  if (fileId === dirId) {
    const grandparent = path.basename(path.dirname(dir));
    if (grandparent === "Backlog") return null; // top-level epic
    const gpId = extractLocalId(grandparent);
    return gpId;
  }

  // Otherwise, parent is the directory's ID
  return dirId ?? null;
}

// ---------- walk directory ----------

function walkDir(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

// ---------- main ----------

async function main() {
  console.log("Reseed TRK backlog from Product/trakr/Backlog/\n");

  // 1. Get the TRK project
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.key, "TRK"));

  if (!project) {
    console.error("TRK project not found. Run db:seed first.");
    process.exit(1);
  }
  console.log(`Found TRK project: id=${project.id}, sequence=${project.sequence}\n`);

  // 2. Delete existing TRK work items
  const existing = await db
    .select({ id: workItems.id })
    .from(workItems)
    .where(eq(workItems.projectId, project.id));

  if (existing.length > 0) {
    console.log(`Deleting ${existing.length} existing TRK work items and related data...`);
    const existingIds = existing.map((e) => e.id);

    // Delete dependent records first (FK constraints)
    for (const id of existingIds) {
      await db.delete(comments).where(eq(comments.workItemId, id));
      await db.delete(workItemSnapshots).where(eq(workItemSnapshots.workItemId, id));
      await db.delete(attachments).where(eq(attachments.workItemId, id));
      await db.delete(statusHistory).where(eq(statusHistory.workItemId, id));
      await db.delete(workItemLinks).where(eq(workItemLinks.sourceId, id));
      await db.delete(workItemLinks).where(eq(workItemLinks.targetId, id));
    }

    // Now delete work items (children first to avoid parent FK issues)
    // Delete in reverse order: stories, then features, then epics
    await db.delete(workItems).where(
      and(eq(workItems.projectId, project.id), eq(workItems.type, "story"))
    );
    await db.delete(workItems).where(
      and(eq(workItems.projectId, project.id), eq(workItems.type, "bug"))
    );
    await db.delete(workItems).where(
      and(eq(workItems.projectId, project.id), eq(workItems.type, "task"))
    );
    await db.delete(workItems).where(
      and(eq(workItems.projectId, project.id), eq(workItems.type, "feature"))
    );
    await db.delete(workItems).where(
      and(eq(workItems.projectId, project.id), eq(workItems.type, "epic"))
    );
  }

  // Reset project sequence to 0
  await db.update(projects).set({ sequence: 0 }).where(eq(projects.id, project.id));

  // 3. Walk the backlog directory and parse all .md files
  const files = walkDir(BACKLOG_DIR);
  console.log(`Found ${files.length} markdown files\n`);

  const items: BacklogItem[] = [];
  const seenIds = new Map<number, string>(); // localId → filePath (first seen)

  for (const filePath of files) {
    const fileName = path.basename(filePath, ".md");
    const localId = extractLocalId(fileName);
    if (localId === null) {
      console.warn(`  SKIP (no ID): ${filePath}`);
      continue;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const { title, type, state } = parseMarkdown(content, filePath);
    const parentLocalId = determineParentLocalId(filePath);

    // Handle duplicate IDs: prefer the folder-descriptor file (feature/epic)
    if (seenIds.has(localId)) {
      const prevPath = seenIds.get(localId)!;
      // Keep the one whose type is higher in hierarchy (epic > feature > story)
      const typeRank: Record<string, number> = { epic: 0, feature: 1, story: 2, bug: 2, task: 2 };
      const prevItem = items.find((i) => i.localId === localId)!;
      if (typeRank[type] < typeRank[prevItem.type]) {
        // Replace: this one is higher in hierarchy
        console.warn(`  DUPLICATE ID ${localId}: replacing "${prevItem.title}" (${prevItem.type}) with "${title}" (${type})`);
        const idx = items.indexOf(prevItem);
        items[idx] = { localId, title, type, state, description: content, parentLocalId, filePath };
        seenIds.set(localId, filePath);
      } else {
        console.warn(`  DUPLICATE ID ${localId}: skipping "${title}" (${type}), keeping "${prevItem.title}" (${prevItem.type})`);
      }
      continue;
    }

    seenIds.set(localId, filePath);
    items.push({ localId, title, type, state, description: content, parentLocalId, filePath });
  }

  // 4. Sort: epics first, then features, then stories/bugs/tasks
  const typeOrder: Record<string, number> = { epic: 0, feature: 1, story: 2, bug: 2, task: 2 };
  items.sort((a, b) => {
    const orderDiff = typeOrder[a.type] - typeOrder[b.type];
    if (orderDiff !== 0) return orderDiff;
    return a.localId - b.localId;
  });

  // 5. Create items in order, mapping localId → actual DB id
  const idMap = new Map<number, number>(); // localId → actual DB id
  let created = 0;
  let sequenceCounter = 0;

  const summary = { epic: 0, feature: 0, story: 0, bug: 0, task: 0 };

  for (const item of items) {
    // Resolve parentId
    let parentId: number | null = null;
    if (item.parentLocalId !== null) {
      parentId = idMap.get(item.parentLocalId) ?? null;
      if (parentId === null) {
        console.warn(`  WARNING: parent ${item.parentLocalId} not yet created for "${item.title}" (${item.localId})`);
      }
    }

    // Generate displayId
    sequenceCounter++;
    const displayId = `${project.key}-${sequenceCounter}`;

    const [row] = await db
      .insert(workItems)
      .values({
        projectId: project.id,
        displayId,
        title: item.title,
        type: item.type,
        state: item.state,
        description: item.description,
        parentId,
        priority: 0,
      })
      .returning();

    idMap.set(item.localId, row.id);
    summary[item.type as keyof typeof summary]++;
    created++;

    const parentStr = parentId ? ` (parent: ${item.parentLocalId} → DB ${parentId})` : "";
    console.log(`  ${displayId} | ${item.type.padEnd(7)} | ${item.title}${parentStr}`);
  }

  // 6. Update project sequence counter
  await db
    .update(projects)
    .set({ sequence: sequenceCounter })
    .where(eq(projects.id, project.id));

  console.log(`\n--- Summary ---`);
  console.log(`Total created: ${created}`);
  console.log(`  Epics:    ${summary.epic}`);
  console.log(`  Features: ${summary.feature}`);
  console.log(`  Stories:  ${summary.story}`);
  console.log(`  Bugs:     ${summary.bug}`);
  console.log(`  Tasks:    ${summary.task}`);
  console.log(`\nProject sequence updated to ${sequenceCounter}`);
  console.log(`\nID mapping (local → displayId):`);
  for (const item of items) {
    const dbId = idMap.get(item.localId);
    console.log(`  #${item.localId} → DB id ${dbId}`);
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
