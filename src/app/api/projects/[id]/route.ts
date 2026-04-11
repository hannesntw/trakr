import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, workItems, sprints, comments, attachments, statusHistory, projectInvites } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

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
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [row] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, Number(id)));
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(row);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    .where(eq(projects.id, Number(id)))
    .returning();
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(row);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pid = Number(id);

  // Get all work item IDs for this project to clean up related data
  const items = await db.select({ id: workItems.id }).from(workItems).where(eq(workItems.projectId, pid));
  const itemIds = items.map(i => i.id);

  // Delete related data
  for (const itemId of itemIds) {
    await db.delete(comments).where(eq(comments.workItemId, itemId));
    await db.delete(attachments).where(eq(attachments.workItemId, itemId));
    await db.delete(statusHistory).where(eq(statusHistory.workItemId, itemId));
  }
  await db.delete(workItems).where(eq(workItems.projectId, pid));
  await db.delete(sprints).where(eq(sprints.projectId, pid));
  await db.delete(projectInvites).where(eq(projectInvites.projectId, pid));
  await db.delete(projects).where(eq(projects.id, pid));

  return NextResponse.json({ deleted: true });
}
