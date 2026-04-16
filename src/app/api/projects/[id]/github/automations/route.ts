import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { githubAutomations, workflowStates, projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { resolveApiUser } from "@/lib/api-auth";
import { requireProjectAccess } from "@/lib/project-auth";

const VALID_EVENTS = ["pr_opened", "pr_merged", "pr_closed", "deploy_succeeded", "deploy_failed"] as const;

const createSchema = z.object({
  event: z.enum(VALID_EVENTS),
  targetStateId: z.string().min(1),
  enabled: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const projectId = id;

  const access = await requireProjectAccess(projectId, user.id, "admin");
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId));
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rules = await db
    .select({
      id: githubAutomations.id,
      projectId: githubAutomations.projectId,
      event: githubAutomations.event,
      targetStateId: githubAutomations.targetStateId,
      enabled: githubAutomations.enabled,
      createdAt: githubAutomations.createdAt,
      stateName: workflowStates.displayName,
    })
    .from(githubAutomations)
    .innerJoin(workflowStates, eq(githubAutomations.targetStateId, workflowStates.id))
    .where(eq(githubAutomations.projectId, projectId));

  return NextResponse.json(rules);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const projectId = id;

  // Check admin access
  const postAccess = await requireProjectAccess(projectId, user.id, "admin");
  if (!postAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId));
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Verify the target state belongs to this project
  const [state] = await db
    .select({ id: workflowStates.id, displayName: workflowStates.displayName })
    .from(workflowStates)
    .where(
      and(
        eq(workflowStates.id, parsed.data.targetStateId),
        eq(workflowStates.projectId, projectId)
      )
    );
  if (!state) {
    return NextResponse.json(
      { error: "Target state not found in this project" },
      { status: 400 }
    );
  }

  const [row] = await db
    .insert(githubAutomations)
    .values({
      projectId,
      event: parsed.data.event,
      targetStateId: parsed.data.targetStateId,
      enabled: parsed.data.enabled ?? true,
    })
    .returning();

  return NextResponse.json({ ...row, stateName: state.displayName }, { status: 201 });
}
