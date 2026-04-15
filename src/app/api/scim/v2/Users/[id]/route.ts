import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizationMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authenticateScimToken, scimError, toScimUser } from "@/lib/scim";

/**
 * GET /api/scim/v2/Users/:id
 * Get a single user.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateScimToken(request);
  if (!auth) return scimError(401, "Unauthorized");

  const { id } = await params;

  // Verify user is a member of this org
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.orgId, auth.orgId),
        eq(organizationMembers.userId, id),
      ),
    );

  if (!member) return scimError(404, "User not found");

  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) return scimError(404, "User not found");

  return NextResponse.json(toScimUser({ ...user, active: true }));
}

/**
 * PUT /api/scim/v2/Users/:id
 * Replace user attributes.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateScimToken(request);
  if (!auth) return scimError(401, "Unauthorized");

  const { id } = await params;

  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.orgId, auth.orgId),
        eq(organizationMembers.userId, id),
      ),
    );
  if (!member) return scimError(404, "User not found");

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return scimError(400, "Invalid JSON body");
  }

  const nameObj = body.name as { givenName?: string; familyName?: string } | undefined;
  const displayName = body.displayName as string | undefined;
  const active = body.active as boolean | undefined;

  const name =
    displayName ??
    ([nameObj?.givenName, nameObj?.familyName].filter(Boolean).join(" ") || undefined);

  // Update user record
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;

  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, id));
  }

  // If active === false, remove from org (deactivate)
  if (active === false) {
    await db
      .delete(organizationMembers)
      .where(
        and(
          eq(organizationMembers.orgId, auth.orgId),
          eq(organizationMembers.userId, id),
        ),
      );
  }

  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) return scimError(404, "User not found");

  return NextResponse.json(toScimUser({ ...user, active: active !== false }));
}

/**
 * PATCH /api/scim/v2/Users/:id
 * Update specific user attributes. Supports SCIM PATCH operations.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateScimToken(request);
  if (!auth) return scimError(401, "Unauthorized");

  const { id } = await params;

  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.orgId, auth.orgId),
        eq(organizationMembers.userId, id),
      ),
    );
  if (!member) return scimError(404, "User not found");

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

  let active = true;
  let nameUpdate: string | undefined;

  for (const op of operations) {
    const opType = op.op.toLowerCase();

    if (opType === "replace") {
      if (op.path === "active") {
        active = op.value === true || op.value === "true";
      } else if (op.path === "displayName" || op.path === "name.formatted") {
        nameUpdate = op.value as string;
      } else if (op.path === "name") {
        const nameVal = op.value as { givenName?: string; familyName?: string };
        nameUpdate = [nameVal.givenName, nameVal.familyName].filter(Boolean).join(" ");
      } else if (!op.path && typeof op.value === "object" && op.value !== null) {
        // Bulk replace without path
        const val = op.value as Record<string, unknown>;
        if ("active" in val) active = val.active === true || val.active === "true";
        if ("displayName" in val) nameUpdate = val.displayName as string;
      }
    }
  }

  const updates: Record<string, unknown> = {};
  if (nameUpdate !== undefined) updates.name = nameUpdate;

  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, id));
  }

  // Deactivate = remove from org
  if (!active) {
    await db
      .delete(organizationMembers)
      .where(
        and(
          eq(organizationMembers.orgId, auth.orgId),
          eq(organizationMembers.userId, id),
        ),
      );
  }

  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) return scimError(404, "User not found");

  return NextResponse.json(toScimUser({ ...user, active }));
}

/**
 * DELETE /api/scim/v2/Users/:id
 * Deactivate user — remove from org but don't delete the user record.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateScimToken(request);
  if (!auth) return scimError(401, "Unauthorized");

  const { id } = await params;

  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.orgId, auth.orgId),
        eq(organizationMembers.userId, id),
      ),
    );

  if (!member) return scimError(404, "User not found");

  // Remove from org (deactivate, don't hard-delete the user)
  await db
    .delete(organizationMembers)
    .where(
      and(
        eq(organizationMembers.orgId, auth.orgId),
        eq(organizationMembers.userId, id),
      ),
    );

  return new NextResponse(null, { status: 204 });
}
