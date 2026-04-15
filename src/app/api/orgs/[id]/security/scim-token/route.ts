import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ssoConfigurations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";
import { resolveApiUser } from "@/lib/api-auth";
import { requireOrgRole, checkIpAllowlist } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";

/**
 * GET /api/orgs/:id/security/scim-token
 * Check whether a SCIM token has been generated for this org.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await resolveApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const orgId = Number(id);

  const member = await requireOrgRole(orgId, user.id, "owner");
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  const [config] = await db
    .select({ scimTokenHash: ssoConfigurations.scimTokenHash })
    .from(ssoConfigurations)
    .where(eq(ssoConfigurations.orgId, orgId));

  return NextResponse.json({
    hasToken: !!config?.scimTokenHash,
  });
}

/**
 * POST /api/orgs/:id/security/scim-token
 * Generate a new SCIM bearer token. Returns the raw token once — it cannot be retrieved again.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await resolveApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const orgId = Number(id);

  const member = await requireOrgRole(orgId, user.id, "owner");
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  // Must have an SSO config to generate a SCIM token
  const [config] = await db
    .select()
    .from(ssoConfigurations)
    .where(eq(ssoConfigurations.orgId, orgId));

  if (!config) {
    return NextResponse.json(
      { error: "SSO must be configured before generating a SCIM token" },
      { status: 400 },
    );
  }

  // Generate a random token with a recognizable prefix
  const rawToken = `scim_str_${randomBytes(32).toString("hex")}`;
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  // Store the hash
  await db
    .update(ssoConfigurations)
    .set({ scimTokenHash: tokenHash })
    .where(eq(ssoConfigurations.orgId, orgId));

  logAudit({
    orgId,
    actorId: user.id,
    actorName: user.name ?? user.email ?? undefined,
    action: "security.scim_token_generated",
    targetType: "security",
    description: "Generated a new SCIM bearer token",
    ipAddress: getClientIp(request),
  });

  // Return the raw token — this is the only time it's visible
  return NextResponse.json({ token: rawToken }, { status: 201 });
}

/**
 * DELETE /api/orgs/:id/security/scim-token
 * Revoke the SCIM token.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await resolveApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const orgId = Number(id);

  const member = await requireOrgRole(orgId, user.id, "owner");
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  await db
    .update(ssoConfigurations)
    .set({ scimTokenHash: null })
    .where(eq(ssoConfigurations.orgId, orgId));

  logAudit({
    orgId,
    actorId: user.id,
    actorName: user.name ?? user.email ?? undefined,
    action: "security.scim_token_revoked",
    targetType: "security",
    description: "Revoked SCIM bearer token",
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ revoked: true });
}
