import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, organizationMembers, orgRoles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { resolveApiUser } from "@/lib/api-auth";
import { DEFAULT_ROLES, type PlanId } from "@/lib/plans";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  plan: z.enum(["free", "developer", "team", "enterprise"]).optional(),
});

export async function GET(request: NextRequest) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all orgs where the user is a member
  const memberships = await db
    .select({ orgId: organizationMembers.orgId, role: organizationMembers.role })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, user.id));

  if (memberships.length === 0) {
    return NextResponse.json([]);
  }

  const orgIds = memberships.map(m => m.orgId);
  const orgs = await db.select().from(organizations);
  const userOrgs = orgs.filter(o => orgIds.includes(o.id));

  // Attach role to each org
  const result = userOrgs.map(org => ({
    ...org,
    role: memberships.find(m => m.orgId === org.id)?.role,
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Check slug uniqueness
  const existing = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, parsed.data.slug));
  if (existing.length > 0) {
    return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
  }

  // Check free plan limit: max 1 org
  const userMemberships = await db
    .select({ orgId: organizationMembers.orgId })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, user.id));

  if (userMemberships.length > 0) {
    // Check if any existing org is on a plan that limits org creation
    const userOrgIds = userMemberships.map(m => m.orgId);
    const userOrgs = await db.select().from(organizations);
    const ownedFreeOrgs = userOrgs.filter(
      o => userOrgIds.includes(o.id) && o.ownerId === user.id && o.plan === "free"
    );
    if (ownedFreeOrgs.length > 0 && (!parsed.data.plan || parsed.data.plan === "free")) {
      return NextResponse.json({ error: "Free plan allows only 1 organization" }, { status: 403 });
    }
  }

  const plan = (parsed.data.plan ?? "free") as PlanId;

  const [org] = await db
    .insert(organizations)
    .values({
      name: parsed.data.name,
      slug: parsed.data.slug,
      plan,
      ownerId: user.id,
    })
    .returning();

  // Add creator as owner member
  await db.insert(organizationMembers).values({
    orgId: org.id,
    userId: user.id,
    role: "owner",
  });

  // Create 5 default roles
  for (const [roleName, permissions] of Object.entries(DEFAULT_ROLES)) {
    await db.insert(orgRoles).values({
      orgId: org.id,
      name: roleName,
      isDefault: true,
      permissions: JSON.stringify(permissions),
    });
  }

  return NextResponse.json(org, { status: 201 });
}
