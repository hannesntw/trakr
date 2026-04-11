import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

const createSchema = z.object({
  label: z.string().min(1),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keys = await db
    .select({ id: apiKeys.id, label: apiKeys.label, keyPrefix: apiKeys.keyPrefix, lastUsedAt: apiKeys.lastUsedAt, createdAt: apiKeys.createdAt })
    .from(apiKeys)
    .where(eq(apiKeys.userId, session.user.id))
    .orderBy(apiKeys.createdAt);
  return NextResponse.json(keys);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const rawKey = "trk_" + randomBytes(24).toString("base64url");
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 8);

  const [row] = await db
    .insert(apiKeys)
    .values({ userId: session.user.id, keyHash, keyPrefix, label: parsed.data.label })
    .returning({ id: apiKeys.id, label: apiKeys.label, keyPrefix: apiKeys.keyPrefix, createdAt: apiKeys.createdAt });

  // Return the raw key ONCE — it can never be retrieved again
  return NextResponse.json({ ...row, key: rawKey }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  await db.delete(apiKeys).where(eq(apiKeys.id, id));
  return NextResponse.json({ deleted: true });
}
