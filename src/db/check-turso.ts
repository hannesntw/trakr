import { createClient } from "@libsql/client";

async function main() {
  const c = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const r = await c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log("Tables:", r.rows.map(r => r.name).join(", "));

  // Check if workflow_states exists
  try {
    const wf = await c.execute("SELECT COUNT(*) as cnt FROM workflow_states");
    console.log("workflow_states rows:", wf.rows[0].cnt);
  } catch {
    console.log("workflow_states: TABLE MISSING");
  }

  try {
    const sq = await c.execute("SELECT COUNT(*) as cnt FROM saved_queries");
    console.log("saved_queries rows:", sq.rows[0].cnt);
  } catch {
    console.log("saved_queries: TABLE MISSING");
  }

  try {
    const wl = await c.execute("SELECT COUNT(*) as cnt FROM work_item_links");
    console.log("work_item_links rows:", wl.rows[0].cnt);
  } catch {
    console.log("work_item_links: TABLE MISSING");
  }
}

main().catch(console.error);
