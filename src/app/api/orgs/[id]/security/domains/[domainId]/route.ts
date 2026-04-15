import { NextRequest, NextResponse } from "next/server";
import { promises as dns } from "dns";
import { db } from "@/db";
import { verifiedDomains } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { resolveApiUser } from "@/lib/api-auth";
import { requireOrgRole, checkIpAllowlist } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";

async function verifyDomain(domain: string, expectedToken: string): Promise<boolean> {
  try {
    const records = await dns.resolveTxt(`_stori-verify.${domain}`);
    // records is an array of arrays of strings (chunks)
    return records.some(record => record.join("").includes(expectedToken));
  } catch {
    return false; // NXDOMAIN, timeout, etc.
  }
}

const policySchema = z.object({
  requireSso: z.boolean().optional(),
  blockMagicLink: z.boolean().optional(),
  autoCapture: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; domainId: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, domainId } = await params;
  const orgId = Number(id);
  const dId = Number(domainId);

  const member = await requireOrgRole(orgId, user.id, "owner");
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  const body = await request.json();

  if (body.action === "verify") {
    // Look up the domain record first to get the token
    const [existing] = await db
      .select()
      .from(verifiedDomains)
      .where(and(eq(verifiedDomains.id, dId), eq(verifiedDomains.orgId, orgId)));

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Perform real DNS TXT verification
    const verified = await verifyDomain(existing.domain, existing.verificationToken);

    if (!verified) {
      logAudit({
        orgId,
        actorId: user.id,
        actorName: user.name ?? user.email ?? undefined,
        action: "security.domain_verification_failed",
        targetType: "security",
        targetId: String(dId),
        description: `DNS verification failed for domain "${existing.domain}"`,
        ipAddress: getClientIp(request),
      });

      return NextResponse.json({
        error: `DNS TXT record not found. Expected: _stori-verify.${existing.domain} with value ${existing.verificationToken}`,
      }, { status: 400 });
    }

    const [row] = await db
      .update(verifiedDomains)
      .set({ status: "verified" })
      .where(and(eq(verifiedDomains.id, dId), eq(verifiedDomains.orgId, orgId)))
      .returning();

    logAudit({
      orgId,
      actorId: user.id,
      actorName: user.name ?? user.email ?? undefined,
      action: "security.domain_verified",
      targetType: "security",
      targetId: String(dId),
      description: `Verified domain "${existing.domain}"`,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json(row);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; domainId: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, domainId } = await params;
  const orgId = Number(id);
  const dId = Number(domainId);

  const member = await requireOrgRole(orgId, user.id, "owner");
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  const body = await request.json();
  const parsed = policySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const updates: Record<string, boolean> = {};
  if (parsed.data.requireSso !== undefined) updates.requireSso = parsed.data.requireSso;
  if (parsed.data.blockMagicLink !== undefined) updates.blockMagicLink = parsed.data.blockMagicLink;
  if (parsed.data.autoCapture !== undefined) updates.autoCapture = parsed.data.autoCapture;

  const [row] = await db
    .update(verifiedDomains)
    .set(updates)
    .where(and(eq(verifiedDomains.id, dId), eq(verifiedDomains.orgId, orgId)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(row);
}
