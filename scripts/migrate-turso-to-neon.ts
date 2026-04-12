// Migrate data from Turso (SQLite) to Neon (Postgres)

import { createClient as createTursoClient } from "@libsql/client";
import { neon } from "@neondatabase/serverless";

const TURSO_URL = process.env.TURSO_DATABASE_URL!;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN!;
const NEON_URL = process.env.DATABASE_URL!;

if (!TURSO_URL || !NEON_URL) {
  console.error("Set TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, and DATABASE_URL");
  process.exit(1);
}

const turso = createTursoClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
const sql = neon(NEON_URL);

// Columns that store Unix timestamps in SQLite but are timestamp in Postgres
const TIMESTAMP_COLS = new Set(["emailVerified", "expires"]);

async function migrateTable(name: string, columns: string[], hasSerial = true) {
  console.log(`  ${name}...`);
  const rows = await turso.execute(`SELECT * FROM "${name}"`);
  if (rows.rows.length === 0) {
    console.log(`    (empty)`);
    return;
  }

  // Clear existing data
  await sql.query(`DELETE FROM "${name}"`);

  // Insert rows one by one
  for (const row of rows.rows) {
    const vals = columns.map(c => {
      const v = row[c];
      if (v == null) return null;
      // Convert Unix timestamps to ISO strings for Postgres timestamp columns
      if (TIMESTAMP_COLS.has(c) && typeof v === "number") {
        return new Date(v * 1000).toISOString();
      }
      return v;
    });
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
    const colList = columns.map(c => `"${c}"`).join(", ");
    await sql.query(`INSERT INTO "${name}" (${colList}) VALUES (${placeholders})`, vals);
  }

  // Reset serial sequence if table has auto-increment
  if (hasSerial) {
    const maxId = Math.max(...rows.rows.map(r => Number(r.id) || 0));
    if (maxId > 0) {
      await sql.query(`SELECT setval(pg_get_serial_sequence('"${name}"', 'id'), $1)`, [maxId]);
    }
  }

  console.log(`    ${rows.rows.length} rows`);
}

async function main() {
  console.log("Migrating data from Turso to Neon...\n");

  // Order matters for foreign keys
  await migrateTable("user", ["id", "name", "email", "emailVerified", "image"]);
  await migrateTable("account", ["id", "userId", "type", "provider", "providerAccountId", "refresh_token", "access_token", "expires_at", "token_type", "scope", "id_token", "session_state"]);
  await migrateTable("session", ["sessionToken", "userId", "expires"], false);
  await migrateTable("verificationToken", ["identifier", "token", "expires"], false);
  await migrateTable("projects", ["id", "name", "key", "description", "visibility", "owner_id", "created_at", "updated_at"]);
  await migrateTable("api_keys", ["id", "user_id", "key_hash", "key_prefix", "label", "last_used_at", "created_at"]);
  await migrateTable("device_codes", ["id", "code", "user_id", "api_key", "status", "expires_at", "created_at"]);
  await migrateTable("project_invites", ["id", "project_id", "email", "created_at"]);
  await migrateTable("workflow_states", ["id", "project_id", "slug", "display_name", "position", "category", "color", "created_at"]);
  await migrateTable("sprints", ["id", "project_id", "name", "goal", "start_date", "end_date", "state", "created_at"]);
  await migrateTable("work_items", ["id", "project_id", "title", "type", "state", "description", "parent_id", "sprint_id", "assignee", "points", "priority", "created_at", "updated_at"]);
  await migrateTable("work_item_snapshots", ["id", "work_item_id", "version", "snapshot", "changed_by", "channel", "created_at"]);
  await migrateTable("status_history", ["id", "work_item_id", "from_state", "to_state", "changed_at"]);
  await migrateTable("work_item_links", ["id", "source_id", "target_id", "type", "created_at"]);
  await migrateTable("saved_queries", ["id", "project_id", "user_id", "name", "query", "starred", "shared", "created_at"]);
  await migrateTable("comments", ["id", "work_item_id", "author", "body", "created_at"]);
  // Skip attachments for now — binary data needs special handling

  console.log("\nDone!");
}

main().catch(console.error);
