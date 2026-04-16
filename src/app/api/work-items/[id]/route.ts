import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workItems, statusHistory, workItemSnapshots, comments, attachments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { emit } from "@/lib/events";
import { resolveApiUser } from "@/lib/api-auth";
import { requireProjectAccess } from "@/lib/project-auth";

/** Resolve a work item ID parameter — accepts CUID2 id or displayId like "TRK-5" */
async function resolveWorkItemId(idParam: string): Promise<string | null> {
  if (/^[A-Z]{2,5}-\d+$/i.test(idParam)) {
    // Display ID format, e.g. "TRK-5"
    const [row] = await db
      .select({ id: workItems.id })
      .from(workItems)
      .where(eq(workItems.displayId, idParam.toUpperCase()));
    return row?.id ?? null;
  }
  // CUID2 string id — use as-is
  return idParam;
}

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(["epic", "feature", "story", "bug", "task", "idea"]).optional(),
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const resolvedId = await resolveWorkItemId(id);
  if (resolvedId === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [row] = await db
    .select()
    .from(workItems)
    .where(eq(workItems.id, resolvedId));
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = await requireProjectAccess(row.projectId, user.id, "viewer");
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const children = await db
    .select()
    .from(workItems)
    .where(eq(workItems.parentId, resolvedId))
    .orderBy(workItems.priority, workItems.id);

  return NextResponse.json({ ...row, children });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate user
  const apiUser = await resolveApiUser(request);
  if (!apiUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const resolvedId = await resolveWorkItemId(id);
  if (resolvedId === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Get current item before update
  const [current] = await db
    .select()
    .from(workItems)
    .where(eq(workItems.id, resolvedId));
  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check project access
  const access = await requireProjectAccess(current.projectId, apiUser.id, "member");
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate canvasColor — default to "blue" if invalid
  const VALID_CANVAS_COLORS = ["red", "blue", "amber", "emerald", "violet", "orange", "pink", "cyan"];
  if (parsed.data.canvasColor && !VALID_CANVAS_COLORS.includes(parsed.data.canvasColor)) {
    parsed.data.canvasColor = "blue";
  }

  // Detect channel
  const channel = (request.headers.get("x-stori-channel") ?? "api") as "web" | "api" | "mcp";
  const changedBy = apiUser.name ?? apiUser.email ?? "system";

  // When promoting from idea to story, clear canvas position fields
  const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date().toISOString() };
  if (parsed.data.type && parsed.data.type !== "idea" && current.type === "idea") {
    updateData.canvasX = null;
    updateData.canvasY = null;
    updateData.canvasColor = null;
  }

  const [row] = await db
    .update(workItems)
    .set(updateData)
    .where(eq(workItems.id, resolvedId))
    .returning();

  // Snapshot the new state
  const [lastSnapshot] = await db
    .select({ version: workItemSnapshots.version })
    .from(workItemSnapshots)
    .where(eq(workItemSnapshots.workItemId, resolvedId))
    .orderBy(desc(workItemSnapshots.version))
    .limit(1);
  const nextVersion = (lastSnapshot?.version ?? -1) + 1;

  await db.insert(workItemSnapshots).values({
    workItemId: resolvedId,
    version: nextVersion,
    snapshot: JSON.stringify(row),
    changedBy,
    channel,
  });

  // Record status transition if state changed
  if (parsed.data.state && parsed.data.state !== current.state) {
    await db.insert(statusHistory).values({
      workItemId: resolvedId,
      fromState: current.state,
      toState: parsed.data.state,
    });
  }

  emit({ type: "work-item", action: "updated", id: row.id, projectId: row.projectId });
  return NextResponse.json(row);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const resolvedId = await resolveWorkItemId(id);
  if (resolvedId === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch the work item to get its projectId for access check
  const [item] = await db.select().from(workItems).where(eq(workItems.id, resolvedId));
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const deleteAccess = await requireProjectAccess(item.projectId, user.id, "member");
  if (!deleteAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Postgres FK ON DELETE CASCADE handles this at the DB level, but
  // the neon-http driver may not see the cascade within a single
  // stateless request. Explicit cleanup ensures it works reliably.
  // See src/db/schema.ts for FK definitions.
  await db.delete(comments).where(eq(comments.workItemId, resolvedId));
  await db.delete(attachments).where(eq(attachments.workItemId, resolvedId));
  await db.delete(statusHistory).where(eq(statusHistory.workItemId, resolvedId));
  await db.delete(workItemSnapshots).where(eq(workItemSnapshots.workItemId, resolvedId));

  const [row] = await db
    .delete(workItems)
    .where(eq(workItems.id, resolvedId))
    .returning();
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  emit({ type: "work-item", action: "deleted", id: row.id, projectId: row.projectId });
  return NextResponse.json({ deleted: true });
}
