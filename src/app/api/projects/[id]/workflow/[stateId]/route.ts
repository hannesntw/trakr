import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workflowStates, workItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  displayName: z.string().min(1).optional(),
  category: z.enum(["todo", "in_progress", "done"]).optional(),
  color: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stateId: string }> }
) {
  const { id, stateId } = await params;
  const projectId = Number(id);
  const stateIdNum = Number(stateId);

  const [existing] = await db
    .select()
    .from(workflowStates)
    .where(
      and(
        eq(workflowStates.id, stateIdNum),
        eq(workflowStates.projectId, projectId)
      )
    );
  if (!existing) {
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

  const [row] = await db
    .update(workflowStates)
    .set(parsed.data)
    .where(eq(workflowStates.id, stateIdNum))
    .returning();

  return NextResponse.json(row);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stateId: string }> }
) {
  const { id, stateId } = await params;
  const projectId = Number(id);
  const stateIdNum = Number(stateId);

  const [existing] = await db
    .select()
    .from(workflowStates)
    .where(
      and(
        eq(workflowStates.id, stateIdNum),
        eq(workflowStates.projectId, projectId)
      )
    );
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Cannot delete if it's the last state in its category
  const sameCategory = await db
    .select({ id: workflowStates.id })
    .from(workflowStates)
    .where(
      and(
        eq(workflowStates.projectId, projectId),
        eq(workflowStates.category, existing.category)
      )
    );
  if (sameCategory.length <= 1) {
    return NextResponse.json(
      { error: `Cannot delete the last "${existing.category}" state` },
      { status: 400 }
    );
  }

  // Check if work items exist with this state's slug
  const items = await db
    .select({ id: workItems.id })
    .from(workItems)
    .where(
      and(
        eq(workItems.projectId, projectId),
        eq(workItems.state, existing.slug)
      )
    );

  if (items.length > 0) {
    // Require migrateToSlug in the body
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // no body
    }

    const migrateToSlug = body.migrateToSlug as string | undefined;
    if (!migrateToSlug) {
      return NextResponse.json(
        {
          error: `${items.length} work item(s) use state "${existing.slug}". Provide "migrateToSlug" to move them.`,
          itemCount: items.length,
        },
        { status: 400 }
      );
    }

    // Validate target slug exists in this project
    const [target] = await db
      .select({ id: workflowStates.id })
      .from(workflowStates)
      .where(
        and(
          eq(workflowStates.projectId, projectId),
          eq(workflowStates.slug, migrateToSlug)
        )
      );
    if (!target) {
      return NextResponse.json(
        { error: `Target state "${migrateToSlug}" not found in this project` },
        { status: 400 }
      );
    }

    // Migrate work items
    await db
      .update(workItems)
      .set({ state: migrateToSlug, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(workItems.projectId, projectId),
          eq(workItems.state, existing.slug)
        )
      );
  }

  await db.delete(workflowStates).where(eq(workflowStates.id, stateIdNum));
  return NextResponse.json({ deleted: true });
}
