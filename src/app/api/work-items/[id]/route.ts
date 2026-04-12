import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workItems, statusHistory, workItemSnapshots } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { emit } from "@/lib/events";

/** Resolve a work item ID parameter — accepts numeric id or displayId like "TRK-5" */
async function resolveWorkItemId(idParam: string): Promise<number | null> {
  if (idParam.includes("-")) {
    // Display ID format, e.g. "TRK-5"
    const [row] = await db
      .select({ id: workItems.id })
      .from(workItems)
      .where(eq(workItems.displayId, idParam.toUpperCase()));
    return row?.id ?? null;
  }
  const num = Number(idParam);
  return isNaN(num) ? null : num;
}

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(["epic", "feature", "story", "bug", "task"]).optional(),
  state: z.string().optional(),
  description: z.string().optional(),
  parentId: z.number().int().positive().nullable().optional(),
  sprintId: z.number().int().positive().nullable().optional(),
  assignee: z.string().nullable().optional(),
  points: z.number().int().refine((v) => [1, 2, 3, 5, 8, 13].includes(v), {
    message: "Points must be one of: 1, 2, 3, 5, 8, 13",
  }).nullable().optional(),
  priority: z.number().int().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  // Detect channel and user
  const channel = (request.headers.get("x-trakr-channel") ?? "api") as "web" | "api" | "mcp";
  const { resolveApiUser } = await import("@/lib/api-auth");
  const apiUser = await resolveApiUser(request);
  const changedBy = apiUser?.name ?? apiUser?.email ?? "system";

  const [row] = await db
    .update(workItems)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(workItems.id, resolvedId))
    .returning();

  // Snapshot the new state
  const [lastSnapshot] = await db
    .select({ version: workItemSnapshots.version })
    .from(workItemSnapshots)
    .where(eq(workItemSnapshots.workItemId, Number(id)))
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

  emit({ type: "work-item", action: "updated", id: row.id });
  return NextResponse.json(row);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const resolvedId = await resolveWorkItemId(id);
  if (resolvedId === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [row] = await db
    .delete(workItems)
    .where(eq(workItems.id, resolvedId))
    .returning();
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  emit({ type: "work-item", action: "deleted", id: row.id });
  return NextResponse.json({ deleted: true });
}
