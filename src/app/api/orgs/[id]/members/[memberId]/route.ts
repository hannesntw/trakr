import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizationMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { resolveApiUser } from "@/lib/api-auth";
import { requireOrgRole, getRoleLevel, checkIpAllowlist } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";

const updateSchema = z.object({
  role: z.enum(["admin", "member", "viewer", "guest"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, memberId } = await params;
  const orgId = id;

  // Only admin+ can change roles
  const actor = await requireOrgRole(orgId, user.id, "admin");
  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Find target member
  const [target] = await db.select().from(organizationMembers).where(eq(organizationMembers.id, memberId));
  if (!target || target.orgId !== orgId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Can't change the owner's role
  if (target.role === "owner") {
    return NextResponse.json({ error: "Cannot change owner role" }, { status: 403 });
  }

  const oldRole = target.role;

  const [row] = await db
    .update(organizationMembers)
    .set({ role: parsed.data.role })
    .where(eq(organizationMembers.id, memberId))
    .returning();

  logAudit({
    orgId,
    actorId: user.id,
    actorName: user.name ?? user.email ?? undefined,
    action: "member.role_changed",
    targetType: "member",
    targetId: target.userId,
    description: `Changed role from ${oldRole} to ${parsed.data.role}`,
    ipAddress: getClientIp(request),
    metadata: { oldRole, newRole: parsed.data.role },
  });

  return NextResponse.json(row);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, memberId } = await params;
  const orgId = id;

  // Only admin+ can remove members
  const actor = await requireOrgRole(orgId, user.id, "admin");
  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  // Find target member
  const [target] = await db.select().from(organizationMembers).where(eq(organizationMembers.id, memberId));
  if (!target || target.orgId !== orgId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Can't remove the owner
  if (target.role === "owner") {
    return NextResponse.json({ error: "Cannot remove owner" }, { status: 403 });
  }

  await db.delete(organizationMembers).where(eq(organizationMembers.id, memberId));

  logAudit({
    orgId,
    actorId: user.id,
    actorName: user.name ?? user.email ?? undefined,
    action: "member.removed",
    targetType: "member",
    targetId: target.userId,
    description: `Removed member (role: ${target.role})`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ deleted: true });
}
