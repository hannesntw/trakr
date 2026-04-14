// Sync local TRK work items + sprints to Turso production
// Reads from localhost API, writes directly to Turso

import { createClient } from "@libsql/client";

const LOCAL_API = "http://localhost:3100";
const LOCAL_KEY = "str_saBiJA_Zt4PMRmstYdpvxUUOXQ-UWMQa";

async function localGet(path: string) {
  const r = await fetch(`${LOCAL_API}${path}`, { headers: { Authorization: `Bearer ${LOCAL_KEY}` } });
  return r.json();
}

async function main() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  if (!tursoUrl || !tursoToken) {
    console.error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN");
    process.exit(1);
  }

  const client = createClient({ url: tursoUrl, authToken: tursoToken });

  const projectId = 4; // TRK
  const sprints = await localGet(`/api/sprints?projectId=${projectId}`);
  const items = await localGet(`/api/work-items?projectId=${projectId}`);

  console.log(`Syncing ${items.length} work items and ${sprints.length} sprints to Turso...`);

  // Disable FK checks for cleanup
  await client.execute("PRAGMA foreign_keys = OFF");

  // Clear existing TRK data on Turso
  await client.execute({ sql: "DELETE FROM attachments WHERE work_item_id IN (SELECT id FROM work_items WHERE project_id = ?)", args: [projectId] });
  await client.execute({ sql: "DELETE FROM work_item_links WHERE source_id IN (SELECT id FROM work_items WHERE project_id = ?)", args: [projectId] });
  await client.execute({ sql: "DELETE FROM comments WHERE work_item_id IN (SELECT id FROM work_items WHERE project_id = ?)", args: [projectId] });
  await client.execute({ sql: "DELETE FROM status_history WHERE work_item_id IN (SELECT id FROM work_items WHERE project_id = ?)", args: [projectId] });
  await client.execute({ sql: "DELETE FROM work_item_snapshots WHERE work_item_id IN (SELECT id FROM work_items WHERE project_id = ?)", args: [projectId] });
  await client.execute({ sql: "DELETE FROM work_items WHERE project_id = ?", args: [projectId] });
  await client.execute({ sql: "DELETE FROM sprints WHERE project_id = ?", args: [projectId] });
  console.log("Cleared existing TRK data.");
  await client.execute("PRAGMA foreign_keys = ON");

  // Insert sprints
  for (const s of sprints) {
    await client.execute({
      sql: "INSERT INTO sprints (id, project_id, name, goal, start_date, end_date, state, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [s.id, projectId, s.name, s.goal ?? null, s.startDate ?? null, s.endDate ?? null, s.state, s.createdAt],
    });
  }
  console.log(`Inserted ${sprints.length} sprints.`);

  // Insert work items ordered by ID (parent_id FK)
  const sorted = items.sort((a: any, b: any) => a.id - b.id);
  for (const i of sorted) {
    await client.execute({
      sql: "INSERT INTO work_items (id, project_id, title, type, state, description, parent_id, sprint_id, assignee, points, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [i.id, projectId, i.title, i.type, i.state, i.description ?? "", i.parentId ?? null, i.sprintId ?? null, i.assignee ?? null, i.points ?? null, i.priority ?? 0, i.createdAt, i.updatedAt],
    });
  }
  console.log(`Inserted ${sorted.length} work items.`);

  // Sync workflow states
  await client.execute({ sql: "DELETE FROM workflow_states WHERE project_id = ?", args: [projectId] });
  const wfRes = await localGet(`/api/projects/${projectId}/workflow`);
  for (const ws of wfRes) {
    await client.execute({
      sql: "INSERT INTO workflow_states (project_id, slug, display_name, position, category, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [projectId, ws.slug, ws.displayName, ws.position, ws.category, ws.color, new Date().toISOString()],
    });
  }
  console.log(`Inserted ${wfRes.length} workflow states.`);

  console.log("Done!");
}

main().catch(console.error);
