import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamProjectAccess, teams, projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { resolveApiUser } from "@/lib/api-auth";
import { requireOrgRole, checkIpAllowlist } from "@/lib/org-auth";

const addSchema = z.object({
  projectId: z.number().int().positive(),
});

const removeSchema = z.object({
  projectId: z.number().int().positive(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, teamId: tid } = await params;
  const orgId = Number(id);
  const teamId = Number(tid);

  // Admin+ to view project access
  const member = await requireOrgRole(orgId, user.id, "member");
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  // Verify team belongs to org
  const [team] = await db.select().from(teams).where(and(eq(teams.id, teamId), eq(teams.orgId, orgId)));
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const access = await db
    .select({
      id: teamProjectAccess.id,
      projectId: teamProjectAccess.projectId,
      projectName: projects.name,
      projectKey: projects.key,
    })
    .from(teamProjectAccess)
    .innerJoin(projects, eq(teamProjectAccess.projectId, projects.id))
    .where(eq(teamProjectAccess.teamId, teamId));

  return NextResponse.json(
    access.map((a) => ({
      id: a.id,
      projectId: a.projectId,
      name: a.projectName,
      key: a.projectKey,
    }))
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, teamId: tid } = await params;
  const orgId = Number(id);
  const teamId = Number(tid);

  // Admin+ only
  const member = await requireOrgRole(orgId, user.id, "admin");
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  // Verify team belongs to org
  const [team] = await db.select().from(teams).where(and(eq(teams.id, teamId), eq(teams.orgId, orgId)));
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Check project exists
  const [project] = await db.select().from(projects).where(eq(projects.id, parsed.data.projectId));
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Check not already assigned
  const [existing] = await db
    .select()
    .from(teamProjectAccess)
    .where(and(eq(teamProjectAccess.teamId, teamId), eq(teamProjectAccess.projectId, parsed.data.projectId)));
  if (existing) {
    return NextResponse.json({ error: "Project already assigned" }, { status: 409 });
  }

  const [row] = await db
    .insert(teamProjectAccess)
    .values({ teamId, projectId: parsed.data.projectId })
    .returning();

  return NextResponse.json(
    { id: row.id, projectId: row.projectId, name: project.name, key: project.key },
    { status: 201 }
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, teamId: tid } = await params;
  const orgId = Number(id);
  const teamId = Number(tid);

  // Admin+ only
  const member = await requireOrgRole(orgId, user.id, "admin");
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  const body = await request.json();
  const parsed = removeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await db
    .delete(teamProjectAccess)
    .where(and(eq(teamProjectAccess.teamId, teamId), eq(teamProjectAccess.projectId, parsed.data.projectId)));

  return NextResponse.json({ ok: true });
}
