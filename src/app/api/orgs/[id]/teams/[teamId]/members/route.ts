import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamMembers, teams, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { resolveApiUser } from "@/lib/api-auth";
import { requireOrgRole, resolveOrgMember, checkIpAllowlist } from "@/lib/org-auth";

const addSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["lead", "member"]).optional(),
});

const removeSchema = z.object({
  userId: z.string().min(1),
});

async function isTeamLead(teamId: number, userId: string): Promise<boolean> {
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
  const orgId = Number(id);
  const teamId = Number(tid);

  const member = await resolveOrgMember(orgId, user.id);
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

  return NextResponse.json(
    members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      user: { name: m.userName, email: m.userEmail },
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

  // Admin+ or team lead
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

  // Verify user is org member
  const targetOrgMember = await resolveOrgMember(orgId, parsed.data.userId);
  if (!targetOrgMember) {
    return NextResponse.json({ error: "User is not an org member" }, { status: 400 });
  }

  // Check not already a team member
  const [existing] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, parsed.data.userId)));
  if (existing) {
    return NextResponse.json({ error: "Already a team member" }, { status: 409 });
  }

  const [row] = await db
    .insert(teamMembers)
    .values({
      teamId,
      userId: parsed.data.userId,
      role: parsed.data.role ?? "member",
    })
    .returning();

  // Get user info
  const [targetUser] = await db.select().from(users).where(eq(users.id, parsed.data.userId));

  return NextResponse.json(
    {
      id: row.id,
      userId: row.userId,
      role: row.role,
      joinedAt: row.joinedAt,
      user: { name: targetUser?.name, email: targetUser?.email },
    },
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

  // Admin+ or team lead
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

  const body = await request.json();
  const parsed = removeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Can't remove the last lead
  const leads = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.role, "lead")));

  const targetMember = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, parsed.data.userId)));

  if (!targetMember[0]) {
    return NextResponse.json({ error: "Not a team member" }, { status: 404 });
  }

  if (targetMember[0].role === "lead" && leads.length <= 1) {
    return NextResponse.json({ error: "Cannot remove the last team lead" }, { status: 400 });
  }

  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, parsed.data.userId)));

  return NextResponse.json({ ok: true });
}
