import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { resolveApiUser } from "@/lib/api-auth";
import { requireOrgRole } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";

/**
 * MFA policy is stored as JSON in the organizations metadata.
 * Since we don't have a dedicated column yet, we use a lightweight
 * approach: store MFA policy in the org's updatedAt-adjacent pattern —
 * but actually we'll keep it simple and use a JSON blob in a new-ish
 * convention: we return sensible defaults and store via PATCH.
 *
 * For now, MFA policy is stored as a JSON string in the org's plan field
 * extension — actually, let's just use a simple in-memory approach
 * backed by a conventions: the GET returns the current policy from
 * a simple key-value store pattern.
 *
 * Simplest approach: we don't have a dedicated table, so we store
 * MFA config as metadata in audit or we use the existing org table.
 * Let's use a pragmatic approach: store in localStorage on client,
 * with API as stub that returns defaults.
 */

const mfaPolicySchema = z.object({
  enforced: z.boolean(),
  gracePeriodDays: z.number().int().min(0).max(30).default(7),
});

// In-memory store per org (sufficient for demo, persists across requests in dev)
const mfaPolicies = new Map<number, { enforced: boolean; gracePeriodDays: number }>();

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

  const policy = mfaPolicies.get(orgId) ?? { enforced: false, gracePeriodDays: 7 };
  return NextResponse.json(policy);
}

export async function PATCH(
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
  const parsed = mfaPolicySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  mfaPolicies.set(orgId, parsed.data);

  logAudit({
    orgId,
    actorId: user.id,
    actorName: user.name ?? user.email ?? undefined,
    action: "security.mfa_updated",
    targetType: "security",
    description: `MFA enforcement ${parsed.data.enforced ? "enabled" : "disabled"} (grace period: ${parsed.data.gracePeriodDays} days)`,
    ipAddress: getClientIp(request),
    metadata: parsed.data,
  });

  return NextResponse.json(parsed.data);
}
