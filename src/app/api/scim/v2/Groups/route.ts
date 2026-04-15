import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teams, teamMembers, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticateScimToken, scimError, scimListResponse, toScimGroup } from "@/lib/scim";

/**
 * GET /api/scim/v2/Groups
 * List groups (teams) in the org.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateScimToken(request);
  if (!auth) return scimError(401, "Unauthorized");

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter");
  const startIndex = Math.max(1, Number(url.searchParams.get("startIndex") ?? "1"));
  const count = Math.min(100, Math.max(1, Number(url.searchParams.get("count") ?? "100")));

  let teamRows = await db
    .select()
    .from(teams)
    .where(eq(teams.orgId, auth.orgId));

  // Basic filter support: displayName eq "..."
  if (filter) {
    const match = filter.match(/displayName\s+eq\s+"([^"]+)"/i);
    if (match) {
      const name = match[1];
      teamRows = teamRows.filter((t) => t.name === name);
    }
  }

  const total = teamRows.length;
  const offset = startIndex - 1;
  const page = teamRows.slice(offset, offset + count);

  // Enrich with members
  const resources = await Promise.all(
    page.map(async (team) => {
      const members = await db
        .select({ userId: teamMembers.userId, email: users.email })
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .where(eq(teamMembers.teamId, team.id));
      return toScimGroup({ ...team, members });
    }),
  );

  return scimListResponse(resources, total, startIndex);
}

/**
 * POST /api/scim/v2/Groups
 * Create a new group (team).
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateScimToken(request);
  if (!auth) return scimError(401, "Unauthorized");

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return scimError(400, "Invalid JSON body");
  }

  const displayName = body.displayName as string | undefined;
  if (!displayName) {
    return scimError(400, "displayName is required");
  }

  const members = body.members as Array<{ value: string }> | undefined;

  const [team] = await db
    .insert(teams)
    .values({
      orgId: auth.orgId,
      name: displayName,
    })
    .returning();

  // Add members if provided
  if (members && members.length > 0) {
    await db.insert(teamMembers).values(
      members.map((m) => ({
        teamId: team.id,
        userId: m.value,
        role: "member",
      })),
    );
  }

  const memberList = (members ?? []).map((m) => ({
    userId: m.value,
    email: null as string | null,
  }));

  return NextResponse.json(toScimGroup({ ...team, members: memberList }), {
    status: 201,
  });
}
