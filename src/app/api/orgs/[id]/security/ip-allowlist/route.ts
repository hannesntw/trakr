import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ipAllowlist } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { resolveApiUser } from "@/lib/api-auth";
import { requireOrgRole } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";

const addSchema = z.object({
  cidr: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
});

const deleteSchema = z.object({
  entryId: z.number(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const orgId = Number(id);

  const member = await requireOrgRole(orgId, user.id, "owner");
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db.select().from(ipAllowlist).where(eq(ipAllowlist.orgId, orgId));
  return NextResponse.json(rows);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const orgId = Number(id);

  const member = await requireOrgRole(orgId, user.id, "owner");
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const [row] = await db
    .insert(ipAllowlist)
    .values({
      orgId,
      cidr: parsed.data.cidr,
      description: parsed.data.description ?? null,
    })
    .returning();

  logAudit({
    orgId,
    actorId: user.id,
    actorName: user.name ?? user.email ?? undefined,
    action: "security.ip_added",
    targetType: "security",
    targetId: String(row.id),
    description: `Added IP allowlist entry "${parsed.data.cidr}"`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const orgId = Number(id);

  const member = await requireOrgRole(orgId, user.id, "owner");
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const [row] = await db
    .delete(ipAllowlist)
    .where(and(eq(ipAllowlist.id, parsed.data.entryId), eq(ipAllowlist.orgId, orgId)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  logAudit({
    orgId,
    actorId: user.id,
    actorName: user.name ?? user.email ?? undefined,
    action: "security.ip_removed",
    targetType: "security",
    targetId: String(parsed.data.entryId),
    description: `Removed IP allowlist entry "${row.cidr}"`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ deleted: true });
}
