import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workItems, projects, githubEvents } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { resolveApiUser } from "@/lib/api-auth";

/** Resolve a work item ID parameter — accepts CUID2 id or displayId like "STRI-5" */
async function resolveId(idParam: string): Promise<string | null> {
  if (idParam.includes("-")) {
    const [row] = await db
      .select({ id: workItems.id })
      .from(workItems)
      .where(eq(workItems.displayId, idParam.toUpperCase()));
    return row?.id ?? null;
  }
  return idParam;
}

/**
 * GET /api/work-items/:id/github
 * Returns all GitHub events for a work item, grouped by type.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const workItemId = await resolveId(id);
  if (!workItemId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Look up the work item and its project's GitHub config
  const [item] = await db
    .select({ id: workItems.id, projectId: workItems.projectId })
    .from(workItems)
    .where(eq(workItems.id, workItemId));

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [project] = await db
    .select({
      githubOwner: projects.githubOwner,
      githubRepo: projects.githubRepo,
    })
    .from(projects)
    .where(eq(projects.id, item.projectId));

  if (!project?.githubOwner || !project?.githubRepo) {
    return NextResponse.json({ linked: false });
  }

  const repo = `${project.githubOwner}/${project.githubRepo}`;

  // Fetch all events for this work item
  const events = await db
    .select()
    .from(githubEvents)
    .where(
      and(
        eq(githubEvents.projectId, item.projectId),
        eq(githubEvents.workItemId, workItemId)
      )
    )
    .orderBy(desc(githubEvents.createdAt));

  // Group by type
  const commits: { sha: string; message: string; createdAt: string }[] = [];
  const pullRequests: {
    number: number;
    title: string | null;
    state: string | null;
    ciStatus: string | null;
  }[] = [];
  const deployments: { status: string | null; createdAt: string }[] = [];
  const ciChecks: { sha: string | null; status: string | null; createdAt: string }[] = [];
  let branch: string | null = null;

  // Track PR numbers we've already added (use latest state)
  const seenPRs = new Set<number>();

  for (const event of events) {
    // Capture branch from any event
    if (event.branch && !branch) {
      branch = event.branch;
    }

    switch (event.eventType) {
      case "push": {
        // Parse payload to extract individual commits
        let parsed: any = null;
        if (event.payload) {
          try {
            parsed = JSON.parse(event.payload);
          } catch {
            // ignore parse errors
          }
        }

        if (parsed?.commits && Array.isArray(parsed.commits)) {
          for (const c of parsed.commits) {
            commits.push({
              sha: c.id ?? c.sha ?? event.sha ?? "",
              message: c.message ?? "",
              createdAt: c.timestamp ?? event.createdAt,
            });
          }
        } else if (event.sha) {
          // Fallback: single commit from event fields
          let message = "";
          if (parsed?.head_commit?.message) {
            message = parsed.head_commit.message;
          }
          commits.push({
            sha: event.sha,
            message,
            createdAt: event.createdAt,
          });
        }
        break;
      }
      case "pull_request": {
        if (event.prNumber != null && !seenPRs.has(event.prNumber)) {
          seenPRs.add(event.prNumber);
          pullRequests.push({
            number: event.prNumber,
            title: event.prTitle,
            state: event.prState,
            ciStatus: event.ciStatus,
          });
        }
        break;
      }
      case "deployment_status": {
        let status = event.action ?? null;
        if (event.payload) {
          try {
            const p = JSON.parse(event.payload);
            if (p.deployment_status?.state) {
              status = p.deployment_status.state;
            }
          } catch {
            // ignore
          }
        }
        deployments.push({
          status,
          createdAt: event.createdAt,
        });
        break;
      }
      case "check_suite": {
        ciChecks.push({
          sha: event.sha,
          status: event.ciStatus ?? event.action ?? null,
          createdAt: event.createdAt,
        });
        break;
      }
    }
  }

  return NextResponse.json({
    linked: true,
    repo,
    branch,
    commits,
    pullRequests,
    deployments,
    ciChecks,
  });
}
