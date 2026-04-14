import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizationMembers, accounts, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/admin-auth";

const patchSchema = z.object({
  isPlatformAdmin: z.boolean().optional(),
  deactivated: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePlatformAdmin(request);
  if ("error" in result) return result.error;

  const { id } = await params;

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.isPlatformAdmin !== undefined) {
    updates.isPlatformAdmin = parsed.data.isPlatformAdmin;
  }

  if (Object.keys(updates).length > 0) {
    const [row] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(row);
  }

  return NextResponse.json({ ok: true, note: "Deactivation is a stub" });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePlatformAdmin(request);
  if ("error" in result) return result.error;

  const { id } = await params;

  await db.delete(organizationMembers).where(eq(organizationMembers.userId, id));
  await db.delete(sessions).where(eq(sessions.userId, id));
  await db.delete(accounts).where(eq(accounts.userId, id));

  const [row] = await db.delete(users).where(eq(users.id, id)).returning();
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
