import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, users, organizationMembers, teamMembers, teamProjectAccess } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { resolveApiUser } from "@/lib/api-auth";
import { requireProjectAccess } from "@/lib/project-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const projectId = id;

  const access = await requireProjectAccess(projectId, user.id, "viewer");
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

  const memberMap = new Map<string, { id: string; name: string | null; email: string | null; image: string | null }>();

  // 1. Project owner
  if (project.ownerId) {
    const [owner] = await db
      .select({ id: users.id, name: users.name, email: users.email, image: users.image })
      .from(users)
      .where(eq(users.id, project.ownerId));
    if (owner) {
      memberMap.set(owner.id, owner);
    }
  }

  // 2. Org members with access (admins/owners + team members with project grants)
  if (project.orgId) {
    // Org admins/owners have implicit access
    const orgAdmins = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.orgId, project.orgId),
        ),
      );

    // Team members with project access
    const teamUserIds = await db
      .select({ userId: teamMembers.userId })
      .from(teamProjectAccess)
      .innerJoin(teamMembers, eq(teamMembers.teamId, teamProjectAccess.teamId))
      .where(eq(teamProjectAccess.projectId, projectId));

    const allUserIds = [...new Set([
      ...orgAdmins.filter(m => m.userId).map(m => m.userId),
      ...teamUserIds.map(t => t.userId),
    ])];

    if (allUserIds.length > 0) {
      const memberUsers = await db
        .select({ id: users.id, name: users.name, email: users.email, image: users.image })
        .from(users)
        .where(inArray(users.id, allUserIds));
      for (const u of memberUsers) {
        memberMap.set(u.id, u);
      }
    }
  }

  return NextResponse.json([...memberMap.values()]);
}
