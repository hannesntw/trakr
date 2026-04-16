/**
 * Import exported JSON data with CUID2 IDs replacing old serial integer PKs.
 * Run with: source .env.production.local && npx tsx scripts/cuid-migration/import.ts
 */
import { neon } from "@neondatabase/serverless";
import { createId } from "@paralleldrive/cuid2";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(__dirname, "data");
const sql = neon(process.env.DATABASE_URL!);

// ---------------------------------------------------------------------------
// 1. Load all JSON files
// ---------------------------------------------------------------------------
function loadTable(name: string): Record<string, unknown>[] {
  const path = join(DATA_DIR, `${name}.json`);
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    console.warn(`  ⚠ No file for ${name}, skipping`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// 2. ID mapping
// ---------------------------------------------------------------------------

// Tables that already have text PKs — identity map
const TEXT_PK_TABLES = new Set([
  "user", "account", "session", "verificationToken", "platform_settings",
]);

// Map: tableName → { oldId → newCuid }
const idMaps: Record<string, Map<number | string, string>> = {};

function getOrCreateId(table: string, oldId: number | string): string {
  if (!idMaps[table]) idMaps[table] = new Map();
  const map = idMaps[table];
  if (map.has(oldId)) return map.get(oldId)!;
  const newId = createId();
  map.set(oldId, newId);
  return newId;
}

function buildIdMap(table: string, rows: Record<string, unknown>[]) {
  if (TEXT_PK_TABLES.has(table)) return; // text PKs stay as-is
  for (const row of rows) {
    if (row.id != null) {
      getOrCreateId(table, row.id as number);
    }
  }
}

// Which table's ID map to use for each FK column
const FK_COLUMN_MAP: Record<string, string> = {
  org_id: "organizations",
  team_id: "teams",
  project_id: "projects",
  work_item_id: "work_items",
  parent_id: "work_items", // self-ref in work_items
  sprint_id: "sprints",
  source_id: "work_items", // work_item_links
  target_id: "work_items", // work_item_links
  target_state_id: "workflow_states", // github_automations
  // Text FK columns — identity (no remapping needed, but listed for documentation)
  // user_id → user (already text)
  // actor_id → user (already text)
  // owner_id → user (already text)
};

// These FK columns reference the user table (text PKs, no remapping)
const TEXT_FK_COLUMNS = new Set(["user_id", "actor_id", "owner_id", "userId"]);

// ---------------------------------------------------------------------------
// 3. Row transformation
// ---------------------------------------------------------------------------
function transformRow(
  table: string,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...row };

  // Replace PK if this is a serial-PK table
  if (!TEXT_PK_TABLES.has(table) && out.id != null) {
    const map = idMaps[table];
    if (map && map.has(out.id as number)) {
      out.id = map.get(out.id as number)!;
    }
  }

  // Replace FK columns
  for (const [col, refTable] of Object.entries(FK_COLUMN_MAP)) {
    if (col in out && out[col] != null) {
      const refMap = idMaps[refTable];
      if (refMap && refMap.has(out[col] as number)) {
        out[col] = refMap.get(out[col] as number)!;
      }
    }
  }

  // Handle attachments data — base64 → Buffer
  if (table === "attachments" && out.data != null) {
    if ((out as Record<string, unknown>).__dataBase64 === true) {
      // Exported as base64
      out.data = Buffer.from(out.data as string, "base64");
    } else if (typeof out.data === "string") {
      // Exported as hex string like \\x89504e47...
      const hexStr = out.data as string;
      out.data = Buffer.from(hexStr.slice(2), "hex");
    }
  }

  // Remove export metadata
  delete out.__dataBase64;

  return out;
}

// ---------------------------------------------------------------------------
// 4. Insert helpers
// ---------------------------------------------------------------------------
async function insertRow(table: string, row: Record<string, unknown>) {
  const keys = Object.keys(row);
  const placeholders = keys.map((_, i) => `$${i + 1}`);
  const values = keys.map((k) => {
    const v = row[k];
    // Convert Buffer to hex for bytea
    if (Buffer.isBuffer(v)) {
      return "\\x" + v.toString("hex");
    }
    return v;
  });

  const quotedCols = keys.map((k) => `"${k}"`).join(", ");
  const query = `INSERT INTO "${table}" (${quotedCols}) VALUES (${placeholders.join(", ")})`;
  await sql.query(query, values);
}

async function insertTable(table: string, rows: Record<string, unknown>[]) {
  const transformed = rows.map((r) => transformRow(table, r));
  let count = 0;
  for (const row of transformed) {
    await insertRow(table, row);
    count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// 5. Topological insert order
// ---------------------------------------------------------------------------

// Tier 0: text PKs, insert as-is (FKs still need translation where applicable)
const TIER_0 = ["user", "account", "session", "verificationToken", "platform_settings"];
// Tier 1
const TIER_1 = ["organizations", "api_keys", "device_codes"];
// Tier 2
const TIER_2 = [
  "organization_members", "organization_invitations", "org_roles",
  "teams", "sso_configurations", "verified_domains", "ip_allowlist",
  "projects", "audit_log",
];
// Tier 3
const TIER_3 = [
  "team_members", "team_project_access", "sprints",
  "workflow_states", "project_invites", "saved_queries",
];
// Tier 4: work_items (two-pass for self-ref parentId)
const TIER_4 = ["work_items"];
// Tier 5: children of work_items
const TIER_5 = [
  "work_item_snapshots", "attachments", "status_history",
  "work_item_links", "comments", "github_automations", "github_events",
];

const ALL_TIERS = [TIER_0, TIER_1, TIER_2, TIER_3, TIER_4, TIER_5];
const ALL_TABLES = ALL_TIERS.flat();

// ---------------------------------------------------------------------------
// 6. Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("CUID2 Migration — Import\n");
  console.log(`Database: ${process.env.DATABASE_URL?.replace(/:[^@]+@/, ":***@")}\n`);

  // Load all data
  const data: Record<string, Record<string, unknown>[]> = {};
  for (const table of ALL_TABLES) {
    data[table] = loadTable(table);
    console.log(`  Loaded ${table}: ${data[table].length} rows`);
  }

  // Build ID maps for all serial-PK tables
  console.log("\nBuilding ID maps...");
  for (const table of ALL_TABLES) {
    buildIdMap(table, data[table]);
    if (!TEXT_PK_TABLES.has(table) && idMaps[table]) {
      console.log(`  ${table}: ${idMaps[table].size} IDs mapped`);
    }
  }

  // Insert tier by tier
  const counts: Record<string, number> = {};

  for (let tierIdx = 0; tierIdx < ALL_TIERS.length; tierIdx++) {
    const tier = ALL_TIERS[tierIdx];
    console.log(`\n--- Tier ${tierIdx} ---`);

    for (const table of tier) {
      const rows = data[table];
      if (rows.length === 0) {
        console.log(`  ${table}: 0 rows (skip)`);
        counts[table] = 0;
        continue;
      }

      if (table === "work_items") {
        // Two-pass insert: first with parentId=null, then UPDATE parentId
        console.log(`  ${table}: inserting ${rows.length} rows (pass 1: nullify parentId)...`);
        const transformed = rows.map((r) => {
          const t = transformRow(table, r);
          // Save the real parentId for the second pass
          (t as Record<string, unknown>).__realParentId = t.parent_id;
          t.parent_id = null;
          return t;
        });

        let count = 0;
        for (const row of transformed) {
          const { __realParentId, ...insertData } = row;
          await insertRow(table, insertData);
          count++;
        }

        // Second pass: update parentId
        console.log(`  ${table}: pass 2 — updating parentId...`);
        let parentUpdates = 0;
        for (const row of transformed) {
          if (row.__realParentId != null) {
            await sql.query(
              `UPDATE "work_items" SET "parent_id" = $1 WHERE "id" = $2`,
              [row.__realParentId, row.id],
            );
            parentUpdates++;
          }
        }
        console.log(`  ${table}: ${count} inserted, ${parentUpdates} parentId updates`);
        counts[table] = count;
      } else {
        console.log(`  ${table}: inserting ${rows.length} rows...`);
        counts[table] = await insertTable(table, rows);
        console.log(`  ${table}: ${counts[table]} rows inserted`);
      }
    }
  }

  // Summary
  console.log("\n========== Import Summary ==========");
  let total = 0;
  for (const table of ALL_TABLES) {
    const c = counts[table] ?? 0;
    total += c;
    console.log(`  ${table.padEnd(28)} ${String(c).padStart(6)} rows`);
  }
  console.log(`  ${"TOTAL".padEnd(28)} ${String(total).padStart(6)} rows`);
  console.log("====================================\n");
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
