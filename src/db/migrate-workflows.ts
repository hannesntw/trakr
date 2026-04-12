import { db } from "./index";
import { projects, workflowStates, workItems } from "./schema";
import { eq } from "drizzle-orm";

const standardPreset = [
  { slug: "new", displayName: "New", position: 0, category: "todo" as const, color: "#9CA3AF" },
  { slug: "ready", displayName: "Ready", position: 1, category: "todo" as const, color: "#F59E0B" },
  { slug: "in_progress", displayName: "In Progress", position: 2, category: "in_progress" as const, color: "#6366F1" },
  { slug: "done", displayName: "Done", position: 3, category: "done" as const, color: "#10B981" },
];

async function main() {
  console.log("Migrating workflow states...");

  // Get all projects
  const allProjects = await db.select().from(projects);
  console.log(`Found ${allProjects.length} project(s)`);

  for (const project of allProjects) {
    // Check if project already has workflow states
    const existing = await db
      .select({ id: workflowStates.id })
      .from(workflowStates)
      .where(eq(workflowStates.projectId, project.id));

    if (existing.length > 0) {
      console.log(`  Project "${project.key}" already has ${existing.length} workflow state(s), skipping.`);
      continue;
    }

    // Create standard preset states
    const rows = standardPreset.map((s) => ({
      projectId: project.id,
      ...s,
    }));
    await db.insert(workflowStates).values(rows);
    console.log(`  Project "${project.key}": created ${rows.length} workflow states.`);
  }

  // Migrate work items with state "active" to "new"
  const activeItems = await db
    .select({ id: workItems.id })
    .from(workItems)
    .where(eq(workItems.state, "active"));

  if (activeItems.length > 0) {
    await db
      .update(workItems)
      .set({ state: "new", updatedAt: new Date().toISOString() })
      .where(eq(workItems.state, "active"));
    console.log(`Migrated ${activeItems.length} work item(s) from "active" to "new".`);
  } else {
    console.log("No work items with state \"active\" to migrate.");
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
