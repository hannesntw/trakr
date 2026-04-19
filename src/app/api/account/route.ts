import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizations, organizationMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { resolveApiUser } from "@/lib/api-auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const apiUser = await resolveApiUser(request);
  if (!apiUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      isPlatformAdmin: users.isPlatformAdmin,
    })
    .from(users)
    .where(eq(users.id, apiUser.id));

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const orgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.orgId))
    .where(eq(organizationMembers.userId, user.id));

  return NextResponse.json({ ...user, orgs });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await db
    .update(users)
    .set({ name: parsed.data.name })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ ok: true });
}
