import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, organizationMembers, organizationInvitations, orgRoles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { resolveApiUser } from "@/lib/api-auth";
import { requireOrgRole, resolveOrgMember, checkIpAllowlist } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
  plan: z.enum(["free", "developer", "team", "enterprise"]).optional(),
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ...org, role: member.role });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const orgId = Number(id);

  // Only owner can update org
  const member = await requireOrgRole(orgId, user.id, "owner");
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Check slug uniqueness if changing
  if (parsed.data.slug) {
    const existing = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, parsed.data.slug));
    if (existing.length > 0 && existing[0].id !== orgId) {
      return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
    }
  }

  const [row] = await db
    .update(organizations)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(organizations.id, orgId))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  logAudit({
    orgId,
    actorId: user.id,
    actorName: user.name ?? user.email ?? undefined,
    action: "organization.updated",
    targetType: "organization",
    targetId: String(orgId),
    description: `Updated organization settings`,
    ipAddress: getClientIp(request),
    metadata: parsed.data,
  });

  return NextResponse.json(row);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const orgId = Number(id);

  // Only owner can delete org
  const member = await requireOrgRole(orgId, user.id, "owner");
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  // Explicit app-side cleanup (belt-and-suspenders like project delete)
  await db.delete(organizationInvitations).where(eq(organizationInvitations.orgId, orgId));
  await db.delete(orgRoles).where(eq(orgRoles.orgId, orgId));
  await db.delete(organizationMembers).where(eq(organizationMembers.orgId, orgId));

  const [row] = await db.delete(organizations).where(eq(organizations.id, orgId)).returning();
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Note: audit entry won't persist since org is deleted (cascade), but log for consistency
  logAudit({
    orgId,
    actorId: user.id,
    actorName: user.name ?? user.email ?? undefined,
    action: "organization.deleted",
    targetType: "organization",
    targetId: String(orgId),
    description: `Deleted organization "${row.name}"`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ deleted: true });
}
