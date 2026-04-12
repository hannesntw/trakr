import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, workflowStates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const reorderSchema = z.object({
  ids: z.array(z.number().int().positive()),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Update position for each state
  const updates = parsed.data.ids.map((stateId, index) =>
    db
      .update(workflowStates)
      .set({ position: index })
      .where(eq(workflowStates.id, stateId))
  );

  await Promise.all(updates);

  // Return the updated list
  const states = await db
    .select({
      id: workflowStates.id,
      slug: workflowStates.slug,
      displayName: workflowStates.displayName,
      position: workflowStates.position,
      category: workflowStates.category,
      color: workflowStates.color,
    })
    .from(workflowStates)
    .where(eq(workflowStates.projectId, projectId))
    .orderBy(workflowStates.position);

  return NextResponse.json(states);
}
