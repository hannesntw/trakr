import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizationInvitations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveApiUser } from "@/lib/api-auth";
import { requireOrgRole, checkIpAllowlist } from "@/lib/org-auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, inviteId } = await params;
  const orgId = Number(id);

  // Only admin+ can revoke invitations
  const member = await requireOrgRole(orgId, user.id, "admin");
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  const [invite] = await db
    .select()
    .from(organizationInvitations)
    .where(eq(organizationInvitations.id, Number(inviteId)));

  if (!invite || invite.orgId !== orgId) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  await db.delete(organizationInvitations).where(eq(organizationInvitations.id, Number(inviteId)));

  return NextResponse.json({ deleted: true });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, inviteId } = await params;
  const orgId = Number(id);

  // Only admin+ can resend invitations
  const member = await requireOrgRole(orgId, user.id, "admin");
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  const body = await request.json().catch(() => ({}));
  if ((body as Record<string, unknown>).action !== "resend") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const [invite] = await db
    .select()
    .from(organizationInvitations)
    .where(eq(organizationInvitations.id, Number(inviteId)));

  if (!invite || invite.orgId !== orgId) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  // Stub: log the resend
  const inviteUrl = `/invite/${invite.token}`;
  console.log(`[org-invite] Resending invite for ${invite.email} to org ${orgId}: ${inviteUrl}`);

  return NextResponse.json({ ...invite, inviteUrl, resent: true });
}
