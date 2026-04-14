import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orgRoles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { resolveApiUser } from "@/lib/api-auth";
import { requireOrgRole } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/plans";

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  permissions: z.array(z.enum(PERMISSIONS as unknown as [string, ...string[]])).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, roleId } = await params;
  const orgId = Number(id);

  // Only admin+ can update roles
  const member = await requireOrgRole(orgId, user.id, "admin");
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const [existing] = await db.select().from(orgRoles).where(eq(orgRoles.id, Number(roleId)));
  if (!existing || existing.orgId !== orgId) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name) updates.name = parsed.data.name;
  if (parsed.data.permissions) updates.permissions = JSON.stringify(parsed.data.permissions);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const [row] = await db
    .update(orgRoles)
    .set(updates)
    .where(eq(orgRoles.id, Number(roleId)))
    .returning();

  logAudit({
    orgId,
    actorId: user.id,
    actorName: user.name ?? user.email ?? undefined,
    action: "role.updated",
    targetType: "role",
    targetId: roleId,
    description: `Updated role "${row.name}"`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ ...row, permissions: JSON.parse(row.permissions) });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, roleId } = await params;
  const orgId = Number(id);

  // Only admin+ can delete roles
  const member = await requireOrgRole(orgId, user.id, "admin");
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [existing] = await db.select().from(orgRoles).where(eq(orgRoles.id, Number(roleId)));
  if (!existing || existing.orgId !== orgId) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  // Can't delete default roles
  if (existing.isDefault) {
    return NextResponse.json({ error: "Cannot delete default roles" }, { status: 403 });
  }

  await db.delete(orgRoles).where(eq(orgRoles.id, Number(roleId)));

  return NextResponse.json({ deleted: true });
}
