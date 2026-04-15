import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, organizationMembers } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { resolveApiUser } from "@/lib/api-auth";
import { requireOrgRole, checkIpAllowlist } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const orgId = Number(id);

  // Admin+ can view session summary
  const member = await requireOrgRole(orgId, user.id, "admin");
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  // Get all member user IDs for this org
  const members = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(eq(organizationMembers.orgId, orgId));

  const userIds = members.map((m) => m.userId);
  if (userIds.length === 0) {
    return NextResponse.json({ activeCount: 0, userCount: 0 });
  }

  // Count active sessions for org members
  const activeSessions = await db
    .select()
    .from(sessions)
    .where(inArray(sessions.userId, userIds));

  const now = new Date();
  const active = activeSessions.filter((s) => s.expires > now);
  const uniqueUsers = new Set(active.map((s) => s.userId));

  return NextResponse.json({
    activeCount: active.length,
    userCount: uniqueUsers.size,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const orgId = Number(id);

  // Admin+ can revoke sessions
  const member = await requireOrgRole(orgId, user.id, "admin");
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

  const body = await request.json();
  if (body.action !== "revoke-all") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  // Get all member user IDs for this org
  const members = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(eq(organizationMembers.orgId, orgId));

  const userIds = members.map((m) => m.userId);
  if (userIds.length > 0) {
    await db.delete(sessions).where(inArray(sessions.userId, userIds));
  }

  logAudit({
    orgId,
    actorId: user.id,
    actorName: user.name ?? user.email ?? undefined,
    action: "security.sessions_revoked",
    targetType: "security",
    description: `Revoked all sessions for ${userIds.length} org members`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ revoked: true });
}
