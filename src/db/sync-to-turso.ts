import { createClient } from "@libsql/client";

const local = createClient({ url: "file:./local.db" });
const remote = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const TABLES = [
  "user",
  "account",
  "session",
  "verificationToken",
  "projects",
  "project_invites",
  "api_keys",
  "device_codes",
  "work_items",
  "sprints",
  "comments",
  "attachments",
  "status_history",
  "work_item_snapshots",
];

async function run() {
  // Clear remote tables in reverse order (to respect foreign keys)
  console.log("Clearing remote tables...");
  for (const table of [...TABLES].reverse()) {
    try {
      await remote.execute(`DELETE FROM "${table}"`);
    } catch (e: any) {
      console.log(`  skip ${table}: ${e.message.slice(0, 60)}`);
    }
  }

  // Copy each table
  for (const table of TABLES) {
    const rows = await local.execute(`SELECT * FROM "${table}"`);
    if (rows.rows.length === 0) {
      console.log(`  ${table}: 0 rows (skip)`);
      continue;
    }

    const cols = rows.columns;
    const placeholders = cols.map(() => "?").join(", ");
    const colNames = cols.map(c => `"${c}"`).join(", ");

    let inserted = 0;
    for (const row of rows.rows) {
      const values = cols.map(c => {
        const v = row[c];
        // Convert Uint8Array (blob) to Buffer for transport
        if (v instanceof Uint8Array || v instanceof Buffer) {
          return Buffer.from(v);
        }
        return v;
      });
      try {
        await remote.execute({
          sql: `INSERT INTO "${table}" (${colNames}) VALUES (${placeholders})`,
          args: values as any,
        });
        inserted++;
      } catch (e: any) {
        if (!e.message.includes("UNIQUE constraint")) {
          console.log(`  ${table} insert error: ${e.message.slice(0, 80)}`);
        }
      }
    }
    console.log(`  ${table}: ${inserted}/${rows.rows.length} rows`);
  }

  // Reset autoincrement sequences
  const seqRows = await local.execute("SELECT * FROM sqlite_sequence");
  for (const row of seqRows.rows) {
    try {
      await remote.execute({
        sql: `INSERT OR REPLACE INTO sqlite_sequence (name, seq) VALUES (?, ?)`,
        args: [row.name as string, row.seq as number],
      });
    } catch {}
  }

  console.log("\nSync complete!");
}

run().catch(console.error);
