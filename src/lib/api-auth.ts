import { NextRequest } from "next/server";
import { db } from "@/db";
import { apiKeys, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import { auth } from "@/auth";

interface ApiUser {
  id: string;
  name: string | null;
  email: string | null;
}

/**
 * Resolve the current user from either:
 * 1. Bearer token (API key) in Authorization header
 * 2. Session cookie (Auth.js)
 * Returns null if neither is present.
 */
export async function resolveApiUser(request: NextRequest): Promise<ApiUser | null> {
  // Check for Bearer token first
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const keyHash = createHash("sha256").update(token).digest("hex");

    const [key] = await db
      .select({ id: apiKeys.id, userId: apiKeys.userId })
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, keyHash));

    if (!key) return null;

    // Update lastUsedAt
    await db.update(apiKeys).set({ lastUsedAt: new Date().toISOString() }).where(eq(apiKeys.id, key.id));

    // Get the user
    const [user] = await db.select().from(users).where(eq(users.id, key.userId));
    if (!user) return null;

    return { id: user.id, name: user.name, email: user.email };
  }

  // Fall back to session auth
  const session = await auth();
  if (session?.user?.id) {
    return { id: session.user.id, name: session.user.name ?? null, email: session.user.email ?? null };
  }

  return null;
}
