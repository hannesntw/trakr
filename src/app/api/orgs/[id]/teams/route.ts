import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teams, teamMembers, teamProjectAccess, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { resolveApiUser } from "@/lib/api-auth";
import { requireOrgRole, resolveOrgMember } from "@/lib/org-auth";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const orgId = Number(id);

  const member = await resolveOrgMember(orgId, user.id);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get teams with member count and project count
  const rows = await db
    .select({
      id: teams.id,
      orgId: teams.orgId,
      name: teams.name,
      description: teams.description,
      createdAt: teams.createdAt,
    })
    .from(teams)
    .where(eq(teams.orgId, orgId));

  // Enrich with counts and lead info
  const enriched = await Promise.all(
    rows.map(async (team) => {
      const members = await db
        .select({
          userId: teamMembers.userId,
          role: teamMembers.role,
          userName: users.name,
        })
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .where(eq(teamMembers.teamId, team.id));

      const projectCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(teamProjectAccess)
        .where(eq(teamProjectAccess.teamId, team.id));

      const lead = members.find((m) => m.role === "lead");

      return {
        ...team,
        membersCount: members.length,
        projectsCount: Number(projectCount[0]?.count ?? 0),
        lead: lead?.userName ?? null,
      };
    })
  );

  return NextResponse.json(enriched);
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
  const orgId = Number(id);

  // Admin+ only
  const member = await requireOrgRole(orgId, user.id, "admin");
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const [team] = await db
    .insert(teams)
    .values({
      orgId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .returning();

  // Add the creating user as team lead
  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: user.id,
    role: "lead",
  });

  return NextResponse.json(
    { ...team, membersCount: 1, projectsCount: 0, lead: user.name },
    { status: 201 }
  );
}
