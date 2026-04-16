import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, workflowStates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { emit } from "@/lib/events";
import { resolveApiUser } from "@/lib/api-auth";
import { requireProjectAccess } from "@/lib/project-auth";

const reorderSchema = z.object({
  ids: z.array(z.string().min(1)),
});

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
  const access = await requireProjectAccess(projectId, user.id, "admin");
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  emit({ type: "workflow", action: "updated", id: projectId, projectId });
  return NextResponse.json(states);
}
