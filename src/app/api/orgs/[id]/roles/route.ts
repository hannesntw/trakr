import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orgRoles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { resolveApiUser } from "@/lib/api-auth";
import { requireOrgRole, resolveOrgMember, checkIpAllowlist } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/plans";

const createSchema = z.object({
  name: z.string().min(1).max(50),
  permissions: z.array(z.enum(PERMISSIONS as unknown as [string, ...string[]])),
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
  const orgId = id;

  // Must be a member to view roles
  const member = await resolveOrgMember(orgId, user.id);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  const rows = await db.select().from(orgRoles).where(eq(orgRoles.orgId, orgId));

  // Parse permissions JSON
  const result = rows.map(r => ({
    ...r,
    permissions: JSON.parse(r.permissions),
  }));

  return NextResponse.json(result);
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
  const orgId = id;

  // Only admin+ can create custom roles
  const member = await requireOrgRole(orgId, user.id, "admin");
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const [row] = await db
    .insert(orgRoles)
    .values({
      orgId,
      name: parsed.data.name,
      isDefault: false,
      permissions: JSON.stringify(parsed.data.permissions),
    })
    .returning();

  logAudit({
    orgId,
    actorId: user.id,
    actorName: user.name ?? user.email ?? undefined,
    action: "role.created",
    targetType: "role",
    targetId: String(row.id),
    description: `Created custom role "${parsed.data.name}"`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ ...row, permissions: parsed.data.permissions }, { status: 201 });
}
