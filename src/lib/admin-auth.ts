import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveApiUser } from "@/lib/api-auth";

/**
 * Resolve the API user and verify they are a platform admin.
 * Returns the user if admin, or a 401/403 NextResponse otherwise.
 */
export async function requirePlatformAdmin(request: NextRequest) {
  const apiUser = await resolveApiUser(request);
  if (!apiUser) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const [user] = await db
    .select({ id: users.id, isPlatformAdmin: users.isPlatformAdmin })
    .from(users)
    .where(eq(users.id, apiUser.id));

  if (!user || !user.isPlatformAdmin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user: apiUser };
}

/**
 * Check if a given userId belongs to a platform admin.
 */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const [user] = await db
    .select({ isPlatformAdmin: users.isPlatformAdmin })
    .from(users)
    .where(eq(users.id, userId));
  return user?.isPlatformAdmin ?? false;
}
