import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { githubAutomations, workflowStates } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { resolveApiUser } from "@/lib/api-auth";

const updateSchema = z.object({
  targetStateId: z.number().int().positive().optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; automationId: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, automationId } = await params;
  const projectId = Number(id);
  const ruleId = Number(automationId);

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // If changing targetStateId, verify it belongs to this project
  if (parsed.data.targetStateId) {
    const [state] = await db
      .select({ id: workflowStates.id })
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
  }

  const [row] = await db
    .update(githubAutomations)
    .set(parsed.data)
    .where(
      and(
        eq(githubAutomations.id, ruleId),
        eq(githubAutomations.projectId, projectId)
      )
    )
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Join the state name for the response
  const [state] = await db
    .select({ displayName: workflowStates.displayName })
    .from(workflowStates)
    .where(eq(workflowStates.id, row.targetStateId));

  return NextResponse.json({ ...row, stateName: state?.displayName });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; automationId: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, automationId } = await params;
  const projectId = Number(id);
  const ruleId = Number(automationId);

  const [row] = await db
    .delete(githubAutomations)
    .where(
      and(
        eq(githubAutomations.id, ruleId),
        eq(githubAutomations.projectId, projectId)
      )
    )
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
