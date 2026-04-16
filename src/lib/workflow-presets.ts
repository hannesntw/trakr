import { db } from "@/db";
import { workflowStates } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface PresetState {
  slug: string;
  displayName: string;
  category: "todo" | "in_progress" | "done";
  color: string;
}

export const PRESETS: Record<string, PresetState[]> = {
  simple: [
    { slug: "todo", displayName: "To Do", category: "todo", color: "#9CA3AF" },
    { slug: "in_progress", displayName: "In Progress", category: "in_progress", color: "#6366F1" },
    { slug: "done", displayName: "Done", category: "done", color: "#10B981" },
  ],
  maker: [
    { slug: "todo", displayName: "To Do", category: "todo", color: "#9CA3AF" },
    { slug: "doing", displayName: "Doing", category: "in_progress", color: "#6366F1" },
    { slug: "done", displayName: "Done", category: "done", color: "#10B981" },
  ],
  standard: [
    { slug: "new", displayName: "New", category: "todo", color: "#9CA3AF" },
    { slug: "ready", displayName: "Ready", category: "todo", color: "#F59E0B" },
    { slug: "in_progress", displayName: "In Progress", category: "in_progress", color: "#6366F1" },
    { slug: "done", displayName: "Done", category: "done", color: "#10B981" },
  ],
  delivery_pipeline: [
    { slug: "in_preparation", displayName: "In Preparation", category: "todo", color: "#9CA3AF" },
    { slug: "ready", displayName: "Ready", category: "todo", color: "#F59E0B" },
    { slug: "in_progress", displayName: "In Progress", category: "in_progress", color: "#6366F1" },
    { slug: "dev_done", displayName: "Dev Done", category: "in_progress", color: "#8B5CF6" },
    { slug: "deployed", displayName: "Deployed", category: "done", color: "#14B8A6" },
    { slug: "done", displayName: "Done", category: "done", color: "#10B981" },
  ],
};

/**
 * Delete all existing workflow states for a project and create new ones from a preset.
 */
export async function applyPreset(projectId: string, presetKey: string) {
  const states = PRESETS[presetKey];
  if (!states) {
    throw new Error(`Unknown preset: ${presetKey}`);
  }

  // Delete existing states
  await db.delete(workflowStates).where(eq(workflowStates.projectId, projectId));

  // Create new states
  const rows = states.map((s, i) => ({
    projectId,
    slug: s.slug,
    displayName: s.displayName,
    position: i,
    category: s.category,
    color: s.color,
  }));

  const inserted = await db.insert(workflowStates).values(rows).returning();
  return inserted;
}
