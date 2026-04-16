import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teams, teamMembers, teamProjectAccess, users, projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { resolveApiUser } from "@/lib/api-auth";
import { requireOrgRole, resolveOrgMember, checkIpAllowlist } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

async function isTeamLead(teamId: string, userId: string): Promise<boolean> {
  const [m] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId), eq(teamMembers.role, "lead")));
  return !!m;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, teamId: tid } = await params;
  const orgId = id;
  const teamId = tid;

  const member = await resolveOrgMember(orgId, user.id);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  const [team] = await db.select().from(teams).where(and(eq(teams.id, teamId), eq(teams.orgId, orgId)));
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const members = await db
    .select({
      id: teamMembers.id,
      userId: teamMembers.userId,
      role: teamMembers.role,
      joinedAt: teamMembers.joinedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId));

  const projectAccess = await db
    .select({
      id: teamProjectAccess.id,
      projectId: teamProjectAccess.projectId,
      projectName: projects.name,
      projectKey: projects.key,
    })
    .from(teamProjectAccess)
    .innerJoin(projects, eq(teamProjectAccess.projectId, projects.id))
    .where(eq(teamProjectAccess.teamId, teamId));

  return NextResponse.json({
    ...team,
    members: members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      user: { name: m.userName, email: m.userEmail },
    })),
    projects: projectAccess.map((p) => ({
      id: p.id,
      projectId: p.projectId,
      name: p.projectName,
      key: p.projectKey,
    })),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, teamId: tid } = await params;
  const orgId = id;
  const teamId = tid;

  // Admin+ or team lead can update
  const orgMember = await resolveOrgMember(orgId, user.id);
  if (!orgMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isAdmin = await requireOrgRole(orgId, user.id, "admin");
  const isLead = await isTeamLead(teamId, user.id);
  if (!isAdmin && !isLead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  const [team] = await db.select().from(teams).where(and(eq(teams.id, teamId), eq(teams.orgId, orgId)));
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(team);
  }

  const [updated] = await db
    .update(teams)
    .set(updates)
    .where(eq(teams.id, teamId))
    .returning();

  return NextResponse.json(updated);
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
  const orgId = id;
  const teamId = tid;

  // Admin+ only
  const member = await requireOrgRole(orgId, user.id, "admin");
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  const [team] = await db.select().from(teams).where(and(eq(teams.id, teamId), eq(teams.orgId, orgId)));
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  await db.delete(teams).where(eq(teams.id, teamId));

  logAudit({
    orgId,
    actorId: user.id,
    actorName: user.name ?? user.email ?? undefined,
    action: "team.deleted",
    targetType: "team",
    targetId: String(teamId),
    description: `Deleted team "${team.name}"`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ ok: true });
}
