/**
 * Export all tables to JSON files for the CUID2 migration.
 * Run with: source .env.production.local && npx tsx scripts/cuid-migration/export.ts
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const OUT_DIR = join(__dirname, "data");
mkdirSync(OUT_DIR, { recursive: true });

// All tables in the database
const TABLES = [
  "user", "account", "session", "verificationToken", "platform_settings",
  "organizations", "organization_members", "organization_invitations",
  "org_roles", "teams", "team_members", "team_project_access",
  "audit_log", "sso_configurations", "verified_domains", "ip_allowlist",
  "projects", "api_keys", "device_codes", "project_invites",
  "workflow_states", "work_items", "work_item_snapshots", "sprints",
  "attachments", "status_history", "work_item_links", "saved_queries",
  "comments", "github_automations", "github_events",
];

async function main() {
  console.log("Exporting tables...\n");

  for (const table of TABLES) {
    const rows = await sql.query(`SELECT * FROM "${table}"`) as Record<string, unknown>[];

    // Handle bytea columns (attachments.data) — encode as base64
    if (table === "attachments") {
      for (const row of rows) {
        if (row.data && Buffer.isBuffer(row.data)) {
          row.data = (row.data as Buffer).toString("base64");
          (row as Record<string, unknown>).__dataBase64 = true;
        } else if (row.data && typeof row.data === "string") {
          // neon-http returns bytea as hex string like \x...
          (row as Record<string, unknown>).__dataBase64 = false;
        }
      }
    }

    const path = join(OUT_DIR, `${table}.json`);
    writeFileSync(path, JSON.stringify(rows, null, 2));
    console.log(`  ${table}: ${rows.length} rows`);
  }

  console.log(`\nDone. Files written to ${OUT_DIR}`);
}

main().catch(console.error);
