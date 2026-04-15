import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizationMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authenticateScimToken, scimError, scimListResponse, toScimUser } from "@/lib/scim";

/**
 * GET /api/scim/v2/Users
 * List users in the org. Supports filter by userName.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateScimToken(request);
  if (!auth) return scimError(401, "Unauthorized");

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter");
  const startIndex = Math.max(1, Number(url.searchParams.get("startIndex") ?? "1"));
  const count = Math.min(100, Math.max(1, Number(url.searchParams.get("count") ?? "100")));

  // Get all members of this org
  const members = await db
    .select({
      userId: organizationMembers.userId,
      id: users.id,
      email: users.email,
      name: users.name,
      emailVerified: users.emailVerified,
      image: users.image,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(eq(organizationMembers.orgId, auth.orgId));

  // Apply SCIM filter (basic support for userName eq "...")
  let filtered = members;
  if (filter) {
    const match = filter.match(/userName\s+eq\s+"([^"]+)"/i);
    if (match) {
      const email = match[1].toLowerCase();
      filtered = members.filter((m) => m.email?.toLowerCase() === email);
    }
  }

  const total = filtered.length;
  const offset = startIndex - 1;
  const page = filtered.slice(offset, offset + count);

  const resources = page.map((m) => toScimUser({ ...m, active: true }));

  return scimListResponse(resources, total, startIndex);
}

/**
 * POST /api/scim/v2/Users
 * Provision a new user. Creates the user record and adds them to the org.
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

  const userName = body.userName as string | undefined;
  const emails = body.emails as Array<{ value: string; primary?: boolean }> | undefined;
  const nameObj = body.name as { givenName?: string; familyName?: string } | undefined;
  const displayName = body.displayName as string | undefined;
  const active = body.active !== false;

  const email = userName ?? emails?.[0]?.value;
  if (!email) {
    return scimError(400, "userName or emails[0].value is required");
  }
  const name = displayName ?? [nameObj?.givenName, nameObj?.familyName].filter(Boolean).join(" ") ?? null;

  // Check if user already exists
  let [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        email,
        name,
        emailVerified: new Date(),
        image: null,
      })
      .returning();
  }

  // Add to org if not already a member
  const [existing] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.orgId, auth.orgId),
        eq(organizationMembers.userId, user.id),
      ),
    );

  if (!existing) {
    await db.insert(organizationMembers).values({
      orgId: auth.orgId,
      userId: user.id,
      role: "member",
    });
  }

  return NextResponse.json(toScimUser({ ...user, active }), { status: 201 });
}
