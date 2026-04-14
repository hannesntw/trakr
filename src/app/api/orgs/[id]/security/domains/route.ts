import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { verifiedDomains } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { randomBytes } from "crypto";
import { resolveApiUser } from "@/lib/api-auth";
import { requireOrgRole } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";

const addDomainSchema = z.object({
  domain: z.string().min(1).max(253).regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i),
});

const deleteDomainSchema = z.object({
  domainId: z.number(),
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

  const rows = await db
    .select()
    .from(verifiedDomains)
    .where(eq(verifiedDomains.orgId, orgId));

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
  const parsed = addDomainSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Block common public email domains
  const publicDomains = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "protonmail.com"];
  if (publicDomains.includes(parsed.data.domain.toLowerCase())) {
    return NextResponse.json({ error: "Public email domains cannot be verified" }, { status: 400 });
  }

  const token = `trk-verify=${randomBytes(16).toString("hex")}`;

  const [row] = await db
    .insert(verifiedDomains)
    .values({
      orgId,
      domain: parsed.data.domain.toLowerCase(),
      verificationToken: token,
    })
    .returning();

  logAudit({
    orgId,
    actorId: user.id,
    actorName: user.name ?? user.email ?? undefined,
    action: "security.domain_added",
    targetType: "security",
    targetId: String(row.id),
    description: `Added domain "${parsed.data.domain}" for verification`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({
    ...row,
    dnsRecord: `_stori-verify.${parsed.data.domain.toLowerCase()} TXT ${token}`,
  }, { status: 201 });
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
  const parsed = deleteDomainSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const [row] = await db
    .delete(verifiedDomains)
    .where(and(eq(verifiedDomains.id, parsed.data.domainId), eq(verifiedDomains.orgId, orgId)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ deleted: true });
}
