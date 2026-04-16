import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ssoConfigurations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { resolveApiUser } from "@/lib/api-auth";
import { requireOrgRole, checkIpAllowlist } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";

const ssoSchema = z.object({
  protocol: z.enum(["saml", "oidc"]),
  entityId: z.string().optional(),
  metadataUrl: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  discoveryUrl: z.string().optional(),
  certificate: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const orgId = id;

  const member = await requireOrgRole(orgId, user.id, "owner");
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  const [config] = await db
    .select()
    .from(ssoConfigurations)
    .where(eq(ssoConfigurations.orgId, orgId));

  return NextResponse.json(config ?? null);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const orgId = id;

  const member = await requireOrgRole(orgId, user.id, "owner");
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  const body = await request.json();
  const parsed = ssoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Upsert: delete existing then insert
  await db.delete(ssoConfigurations).where(eq(ssoConfigurations.orgId, orgId));

  const [row] = await db
    .insert(ssoConfigurations)
    .values({
      orgId,
      protocol: parsed.data.protocol,
      entityId: parsed.data.entityId ?? null,
      metadataUrl: parsed.data.metadataUrl ?? null,
      clientId: parsed.data.clientId ?? null,
      clientSecret: parsed.data.clientSecret ?? null,
      discoveryUrl: parsed.data.discoveryUrl ?? null,
      certificate: parsed.data.certificate ?? null,
    })
    .returning();

  logAudit({
    orgId,
    actorId: user.id,
    actorName: user.name ?? user.email ?? undefined,
    action: "security.sso_configured",
    targetType: "security",
    description: `Configured SSO (${parsed.data.protocol.toUpperCase()})`,
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
  const orgId = id;

  const member = await requireOrgRole(orgId, user.id, "owner");
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  await db.delete(ssoConfigurations).where(eq(ssoConfigurations.orgId, orgId));

  logAudit({
    orgId,
    actorId: user.id,
    actorName: user.name ?? user.email ?? undefined,
    action: "security.sso_removed",
    targetType: "security",
    description: "Removed SSO configuration",
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ deleted: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const orgId = id;

  const member = await requireOrgRole(orgId, user.id, "owner");
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  const body = await request.json();
  const enforced = z.boolean().parse(body.enforced);

  const [row] = await db
    .update(ssoConfigurations)
    .set({ enforced })
    .where(eq(ssoConfigurations.orgId, orgId))
    .returning();

  if (!row) return NextResponse.json({ error: "No SSO configuration found" }, { status: 404 });

  logAudit({
    orgId,
    actorId: user.id,
    actorName: user.name ?? user.email ?? undefined,
    action: "security.sso_configured",
    targetType: "security",
    description: `SSO enforcement ${enforced ? "enabled" : "disabled"}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(row);
}
