import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teams, teamMembers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authenticateScimToken, scimError, toScimGroup } from "@/lib/scim";

/**
 * GET /api/scim/v2/Groups/:id
 * Get a single group with members.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateScimToken(request);
  if (!auth) return scimError(401, "Unauthorized");

  const { id } = await params;
  const teamId = id;

  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.orgId, auth.orgId)));

  if (!team) return scimError(404, "Group not found");

  const members = await db
    .select({ userId: teamMembers.userId, email: users.email })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId));

  return NextResponse.json(toScimGroup({ ...team, members }));
}

/**
 * PUT /api/scim/v2/Groups/:id
 * Replace group — update name and replace all members.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateScimToken(request);
  if (!auth) return scimError(401, "Unauthorized");

  const { id } = await params;
  const teamId = id;

  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.orgId, auth.orgId)));

  if (!team) return scimError(404, "Group not found");

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return scimError(400, "Invalid JSON body");
  }

  const displayName = body.displayName as string | undefined;
  const members = body.members as Array<{ value: string }> | undefined;

  // Update name if provided
  if (displayName) {
    await db.update(teams).set({ name: displayName }).where(eq(teams.id, teamId));
  }

  // Replace all members
  if (members !== undefined) {
    await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));

    if (members.length > 0) {
      await db.insert(teamMembers).values(
        members.map((m) => ({
          teamId,
          userId: m.value,
          role: "member",
        })),
      );
    }
  }

  // Return updated group
  const [updated] = await db.select().from(teams).where(eq(teams.id, teamId));
  const updatedMembers = await db
    .select({ userId: teamMembers.userId, email: users.email })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId));

  return NextResponse.json(toScimGroup({ ...updated, members: updatedMembers }));
}

/**
 * PATCH /api/scim/v2/Groups/:id
 * Update group members (add/remove) or rename.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateScimToken(request);
  if (!auth) return scimError(401, "Unauthorized");

  const { id } = await params;
  const teamId = id;

  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.orgId, auth.orgId)));

  if (!team) return scimError(404, "Group not found");

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return scimError(400, "Invalid JSON body");
  }

  const operations = body.Operations as Array<{
    op: string;
    path?: string;
    value?: unknown;
  }> ?? [];

  for (const op of operations) {
    const opType = op.op.toLowerCase();

    if (opType === "replace" && op.path === "displayName") {
      await db.update(teams).set({ name: op.value as string }).where(eq(teams.id, teamId));
    }

    // Add members
    if (opType === "add" && op.path === "members") {
      const newMembers = op.value as Array<{ value: string }>;
      if (newMembers && newMembers.length > 0) {
        for (const m of newMembers) {
          // Check not already a member
          const [existing] = await db
            .select()
            .from(teamMembers)
            .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, m.value)));
          if (!existing) {
            await db.insert(teamMembers).values({
              teamId,
              userId: m.value,
              role: "member",
            });
          }
        }
      }
    }

    // Remove members
    if (opType === "remove" && op.path?.startsWith("members")) {
      // SCIM uses path like members[value eq "userId"]
      const match = op.path.match(/members\[value\s+eq\s+"([^"]+)"\]/i);
      if (match) {
        const userId = match[1];
        await db
          .delete(teamMembers)
          .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
      }
    }

    // Replace members entirely
    if (opType === "replace" && op.path === "members") {
      await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
      const newMembers = op.value as Array<{ value: string }>;
      if (newMembers && newMembers.length > 0) {
        await db.insert(teamMembers).values(
          newMembers.map((m) => ({
            teamId,
            userId: m.value,
            role: "member",
          })),
        );
      }
    }
  }

  // Return updated group
  const [updated] = await db.select().from(teams).where(eq(teams.id, teamId));
  const updatedMembers = await db
    .select({ userId: teamMembers.userId, email: users.email })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId));

  return NextResponse.json(toScimGroup({ ...updated, members: updatedMembers }));
}

/**
 * DELETE /api/scim/v2/Groups/:id
 * Delete group (team).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateScimToken(request);
  if (!auth) return scimError(401, "Unauthorized");

  const { id } = await params;
  const teamId = id;

  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.orgId, auth.orgId)));

  if (!team) return scimError(404, "Group not found");

  // Cascade deletes team_members and team_project_access via FK
  await db.delete(teams).where(eq(teams.id, teamId));

  return new NextResponse(null, { status: 204 });
}
