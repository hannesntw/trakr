import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, githubEvents, githubAutomations, workflowStates } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";
import { randomBytes } from "crypto";
import { resolveApiUser } from "@/lib/api-auth";
import { emit } from "@/lib/events";

const linkSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [row] = await db
    .select({
      githubOwner: projects.githubOwner,
      githubRepo: projects.githubRepo,
    })
    .from(projects)
    .where(eq(projects.id, Number(id)));

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    owner: row.githubOwner,
    repo: row.githubRepo,
    linked: !!(row.githubOwner && row.githubRepo),
  });
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
  const body = await request.json();
  const parsed = linkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const webhookSecret = randomBytes(32).toString("hex");

  const [row] = await db
    .update(projects)
    .set({
      githubOwner: parsed.data.owner,
      githubRepo: parsed.data.repo,
      githubWebhookSecret: webhookSecret,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(projects.id, Number(id)))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  emit({ type: "project", action: "updated", id: row.id, projectId: row.id });

  // Create default automation rules based on the project's workflow states
  const states = await db
    .select({
      id: workflowStates.id,
      slug: workflowStates.slug,
      displayName: workflowStates.displayName,
      category: workflowStates.category,
      position: workflowStates.position,
    })
    .from(workflowStates)
    .where(eq(workflowStates.projectId, row.id))
    .orderBy(asc(workflowStates.position));

  const inProgressStates = states.filter((s) => s.category === "in_progress");
  const doneStates = states.filter((s) => s.category === "done");

  const defaultRules: Array<{ event: string; targetStateId: number }> = [];

  // pr_opened → first in_progress state
  if (inProgressStates.length > 0) {
    defaultRules.push({ event: "pr_opened", targetStateId: inProgressStates[0].id });
  }

  // pr_merged → state named like "dev done", or second in_progress state, or first done state
  const devDoneState = inProgressStates.find(
    (s) => s.slug.includes("dev_done") || s.displayName.toLowerCase().includes("dev done")
  );
  if (devDoneState) {
    defaultRules.push({ event: "pr_merged", targetStateId: devDoneState.id });
  } else if (inProgressStates.length > 1) {
    defaultRules.push({ event: "pr_merged", targetStateId: inProgressStates[1].id });
  } else if (doneStates.length > 0) {
    defaultRules.push({ event: "pr_merged", targetStateId: doneStates[0].id });
  }

  // deploy_succeeded → first done state
  if (doneStates.length > 0) {
    defaultRules.push({ event: "deploy_succeeded", targetStateId: doneStates[0].id });
  }

  if (defaultRules.length > 0) {
    await db.insert(githubAutomations).values(
      defaultRules.map((r) => ({
        projectId: row.id,
        event: r.event,
        targetStateId: r.targetStateId,
      }))
    );
  }

  return NextResponse.json({
    owner: row.githubOwner,
    repo: row.githubRepo,
    linked: true,
    webhookSecret,
  });
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
  const pid = Number(id);

  // Delete all github events and automation rules for this project
  await db.delete(githubEvents).where(eq(githubEvents.projectId, pid));
  await db.delete(githubAutomations).where(eq(githubAutomations.projectId, pid));

  const [row] = await db
    .update(projects)
    .set({
      githubOwner: null,
      githubRepo: null,
      githubWebhookSecret: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(projects.id, pid))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  emit({ type: "project", action: "updated", id: row.id, projectId: row.id });

  return NextResponse.json({ unlinked: true });
}
