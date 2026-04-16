import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, workItems, sprints, comments, attachments, statusHistory, projectInvites, workItemSnapshots, savedQueries, workflowStates, githubEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { emit } from "@/lib/events";
import { resolveApiUser } from "@/lib/api-auth";
import { requireProjectAccess } from "@/lib/project-auth";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  key: z
    .string()
    .min(2)
    .max(5)
    .transform((v) => v.toUpperCase())
    .optional(),
  description: z.string().optional(),
  visibility: z.enum(["public", "private"]).optional(),
  ownerId: z.string().optional(),
  githubStatusChecks: z.boolean().optional(),
  githubPrComments: z.boolean().optional(),
  makerMode: z.boolean().optional(),
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
  const access = await requireProjectAccess(id, user.id, "viewer");
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [row] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id));
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(row);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check admin access
  const access = await requireProjectAccess(id, user.id, "admin");
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const [row] = await db
    .update(projects)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(projects.id, id))
    .returning();
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  emit({ type: "project", action: "updated", id: row.id, projectId: row.id });
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

  // Check owner access
  const access = await requireProjectAccess(id, user.id, "owner");
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pid = id;

  // Postgres FK ON DELETE CASCADE is defined in the schema, but the
  // neon-http driver (stateless HTTP per query) doesn't reliably see
  // cascades. Explicit app-side cleanup as belt-and-suspenders.
  // See src/db/schema.ts for FK definitions.
  const items = await db.select({ id: workItems.id }).from(workItems).where(eq(workItems.projectId, pid));
  for (const item of items) {
    await db.delete(comments).where(eq(comments.workItemId, item.id));
    await db.delete(attachments).where(eq(attachments.workItemId, item.id));
    await db.delete(statusHistory).where(eq(statusHistory.workItemId, item.id));
    await db.delete(workItemSnapshots).where(eq(workItemSnapshots.workItemId, item.id));
  }
  await db.delete(workItems).where(eq(workItems.projectId, pid));
  await db.delete(githubEvents).where(eq(githubEvents.projectId, pid));
  await db.delete(savedQueries).where(eq(savedQueries.projectId, pid));
  await db.delete(sprints).where(eq(sprints.projectId, pid));
  await db.delete(workflowStates).where(eq(workflowStates.projectId, pid));
  await db.delete(projectInvites).where(eq(projectInvites.projectId, pid));

  const [row] = await db.delete(projects).where(eq(projects.id, pid)).returning();
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  emit({ type: "project", action: "deleted", id: pid, projectId: pid });
  return NextResponse.json({ deleted: true });
}
