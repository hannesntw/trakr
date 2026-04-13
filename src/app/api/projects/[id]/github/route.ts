import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, githubEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
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

  // Delete all github events for this project
  await db.delete(githubEvents).where(eq(githubEvents.projectId, pid));

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
