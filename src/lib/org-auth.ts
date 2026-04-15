import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizationMembers, ipAllowlist } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { DEFAULT_ROLES, type Permission } from "./plans";

const ROLE_HIERARCHY = ["guest", "viewer", "member", "admin", "owner"] as const;
type RoleName = (typeof ROLE_HIERARCHY)[number];

export async function resolveOrgMember(orgId: number, userId: string) {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)));
  return member ?? null;
}

export async function requireOrgRole(orgId: number, userId: string, minRole: RoleName) {
  const member = await resolveOrgMember(orgId, userId);
  if (!member) return null;
  const memberLevel = ROLE_HIERARCHY.indexOf(member.role as RoleName);
  const requiredLevel = ROLE_HIERARCHY.indexOf(minRole);
  if (memberLevel < 0 || memberLevel < requiredLevel) return null;
  return member;
}

export function hasPermission(role: string, permission: Permission): boolean {
  const perms = DEFAULT_ROLES[role];
  if (!perms) return false;
  return perms.includes(permission);
}

export function getRoleLevel(role: string): number {
  return ROLE_HIERARCHY.indexOf(role as RoleName);
}

// --- IP allowlist enforcement ---

/**
 * Check whether an IPv4 address falls within a CIDR range.
 * Works for /0 through /32. No external dependencies.
 */
function ipInCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split("/");
  if (!range || !bitsStr) return ip === cidr; // plain IP, no mask
  const bits = parseInt(bitsStr, 10);
  if (bits === 0) return true; // /0 matches everything
  const mask = ~(2 ** (32 - bits) - 1);
  const ipNum = ip.split(".").reduce((a, b) => (a << 8) | parseInt(b, 10), 0);
  const rangeNum = range.split(".").reduce((a, b) => (a << 8) | parseInt(b, 10), 0);
  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Enforce IP allowlist for an org. Returns a 403 NextResponse if the
 * request IP is blocked, or null if the request is allowed.
 *
 * Call this from org-scoped API route handlers after auth + role checks.
 * If the org has no enabled allowlist entries the request is always allowed.
 */
export async function checkIpAllowlist(
  orgId: number,
  request: NextRequest,
): Promise<NextResponse | null> {
  const entries = await db
    .select()
    .from(ipAllowlist)
    .where(and(eq(ipAllowlist.orgId, orgId), eq(ipAllowlist.enabled, true)));

  // No entries → no restriction
  if (entries.length === 0) return null;

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;

  // If we can't determine the IP, deny
  if (!clientIp) {
    return NextResponse.json({ error: "IP not allowed" }, { status: 403 });
  }

  const allowed = entries.some((e) => ipInCidr(clientIp, e.cidr));
  if (!allowed) {
    return NextResponse.json({ error: "IP not allowed" }, { status: 403 });
  }

  return null;
}
