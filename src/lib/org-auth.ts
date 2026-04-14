import { db } from "@/db";
import { organizationMembers } from "@/db/schema";
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
