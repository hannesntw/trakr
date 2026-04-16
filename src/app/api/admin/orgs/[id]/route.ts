import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, organizationMembers, organizationInvitations, orgRoles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/admin-auth";

const patchSchema = z.object({
  plan: z.enum(["free", "developer", "team", "enterprise"]).optional(),
  suspended: z.boolean().optional(),
  name: z.string().min(1).max(100).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePlatformAdmin(request);
  if ("error" in result) return result.error;

  const { id } = await params;
  const orgId = id;

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const updates: Record<string, string> = { updatedAt: new Date().toISOString() };
  if (parsed.data.plan) updates.plan = parsed.data.plan;
  if (parsed.data.name) updates.name = parsed.data.name;

  const [row] = await db
    .update(organizations)
    .set(updates)
    .where(eq(organizations.id, orgId))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(row);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePlatformAdmin(request);
  if ("error" in result) return result.error;

  const { id } = await params;
  const orgId = id;

  await db.delete(organizationInvitations).where(eq(organizationInvitations.orgId, orgId));
  await db.delete(orgRoles).where(eq(orgRoles.orgId, orgId));
  await db.delete(organizationMembers).where(eq(organizationMembers.orgId, orgId));

  const [row] = await db.delete(organizations).where(eq(organizations.id, orgId)).returning();
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
