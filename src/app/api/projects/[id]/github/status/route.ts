import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, githubEvents } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Returns the latest PR/CI state per work item for a project.
 * Used by the board to overlay GitHub badges on cards.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  const [project] = await db
    .select({
      id: projects.id,
      githubOwner: projects.githubOwner,
      githubRepo: projects.githubRepo,
    })
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!project.githubOwner || !project.githubRepo) {
    return NextResponse.json({ linked: false, items: {} });
  }

  // Get all github events for this project, ordered by most recent first
  const events = await db
    .select()
    .from(githubEvents)
    .where(eq(githubEvents.projectId, projectId))
    .orderBy(desc(githubEvents.createdAt));

  // Build a map of workItemId -> latest PR/CI/branch info
  const itemMap: Record<
    number,
    {
      prNumber: number | null;
      prTitle: string | null;
      prState: string | null;
      branch: string | null;
      ciStatus: string | null;
    }
  > = {};

  for (const event of events) {
    if (!event.workItemId) continue;
    if (!itemMap[event.workItemId]) {
      itemMap[event.workItemId] = {
        prNumber: null,
        prTitle: null,
        prState: null,
        branch: null,
        ciStatus: null,
      };
    }
    const entry = itemMap[event.workItemId];

    // Fill in fields from the most recent event that has them
    if (event.prNumber != null && entry.prNumber == null) {
      entry.prNumber = event.prNumber;
      entry.prTitle = event.prTitle;
      entry.prState = event.prState;
    }
    if (event.branch && !entry.branch) {
      entry.branch = event.branch;
    }
    if (event.ciStatus && !entry.ciStatus) {
      entry.ciStatus = event.ciStatus;
    }
  }

  return NextResponse.json({
    linked: true,
    repo: `${project.githubOwner}/${project.githubRepo}`,
    items: itemMap,
  });
}
