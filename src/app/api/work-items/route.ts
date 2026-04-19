import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workItems, projects, statusHistory, workflowStates } from "@/db/schema";
import { eq, and, ilike, or, sql, asc, SQL } from "drizzle-orm";
import { z } from "zod";
import { emit } from "@/lib/events";
import { resolveApiUser } from "@/lib/api-auth";
import { requireProjectAccess } from "@/lib/project-auth";

const createSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(["epic", "feature", "story", "bug", "task", "idea"]),
  state: z.string().optional(),
  description: z.string().optional(),
  parentId: z.string().min(1).nullable().optional(),
  sprintId: z.string().min(1).nullable().optional(),
  assignee: z.string().nullable().optional(),
  points: z.number().int().refine((v) => [1, 2, 3, 5, 8, 13].includes(v), {
    message: "Points must be one of: 1, 2, 3, 5, 8, 13",
  }).nullable().optional(),
  priority: z.number().int().optional(),
  canvasX: z.number().int().nullable().optional(),
  canvasY: z.number().int().nullable().optional(),
  canvasColor: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.searchParams;
  const conditions: SQL[] = [];

  const projectId = url.get("projectId");
  if (!projectId) {
    return NextResponse.json(
      { error: "projectId query parameter is required" },
      { status: 400 }
    );
  }
  const access = await requireProjectAccess(projectId, user.id, "viewer");
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  conditions.push(eq(workItems.projectId, projectId));

  const type = url.get("type");
  if (type) conditions.push(eq(workItems.type, type as "epic" | "feature" | "story"));

  const state = url.get("state");
  if (state) conditions.push(eq(workItems.state, state));

  const sprintId = url.get("sprintId");
  if (sprintId) conditions.push(eq(workItems.sprintId, sprintId));

  const parentId = url.get("parentId");
  if (parentId) conditions.push(eq(workItems.parentId, parentId));

  const q = url.get("q");
  if (q) conditions.push(or(ilike(workItems.title, `%${q}%`), ilike(workItems.displayId, `%${q}%`))!);

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db
    .select()
    .from(workItems)
    .where(where)
    .orderBy(workItems.priority, workItems.id);

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  // Require authenticated user
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Check project access
  const access = await requireProjectAccess(parsed.data.projectId, user.id, "member");
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Generate displayId from project key + sequence (atomic increment)
  const [project] = await db
    .update(projects)
    .set({ sequence: sql`${projects.sequence} + 1` })
    .where(eq(projects.id, parsed.data.projectId))
    .returning({ key: projects.key, sequence: projects.sequence });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const displayId = `${project.key}-${project.sequence}`;

  // Resolve valid workflow state for this project
  const wfStates = await db
    .select()
    .from(workflowStates)
    .where(eq(workflowStates.projectId, parsed.data.projectId))
    .orderBy(asc(workflowStates.position));

  if (wfStates.length === 0) {
    return NextResponse.json(
      { error: "Project has no workflow states. Apply a preset via POST /api/projects/:id/workflow before creating work items." },
      { status: 400 }
    );
  }

  const match = parsed.data.state && wfStates.find((s) => s.slug === parsed.data.state);
  const resolvedState = match ? match.slug : wfStates[0].slug;

  // Validate canvasColor — default to "blue" if invalid
  const VALID_CANVAS_COLORS = ["red", "blue", "amber", "emerald", "violet", "orange", "pink", "cyan"];
  if (parsed.data.canvasColor && !VALID_CANVAS_COLORS.includes(parsed.data.canvasColor)) {
    parsed.data.canvasColor = "blue";
  }

  // Auto-place ideas if no position given
  let canvasX = parsed.data.canvasX ?? null;
  let canvasY = parsed.data.canvasY ?? null;
  if (parsed.data.type === "idea" && canvasX == null && canvasY == null) {
    const existingIdeas = await db
      .select({ canvasY: workItems.canvasY })
      .from(workItems)
      .where(and(eq(workItems.projectId, parsed.data.projectId), eq(workItems.type, "idea")));
    const maxY = existingIdeas.reduce((max, i) => Math.max(max, i.canvasY ?? 0), 0);
    canvasX = 200;
    canvasY = existingIdeas.length > 0 ? maxY + 220 : 100;
  }

  const [row] = await db.insert(workItems).values({ ...parsed.data, displayId, state: resolvedState, canvasX, canvasY }).returning();

  // Record initial status in status_history so the timeline shows the creation state
  await db.insert(statusHistory).values({
    workItemId: row.id,
    fromState: "(created)",
    toState: row.state,
    changedAt: row.createdAt,
  });

  emit({ type: "work-item", action: "created", id: row.id, projectId: row.projectId });
  return NextResponse.json(row, { status: 201 });
}
