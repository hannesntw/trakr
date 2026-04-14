import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { platformSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const result = await requirePlatformAdmin(request);
  if ("error" in result) return result.error;

  const rows = await db.select().from(platformSettings);
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }

  return NextResponse.json(settings);
}

const patchSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

export async function PATCH(request: NextRequest) {
  const result = await requirePlatformAdmin(request);
  if ("error" in result) return result.error;

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, parsed.data.key));

  if (existing.length > 0) {
    await db
      .update(platformSettings)
      .set({ value: parsed.data.value, updatedAt: new Date().toISOString() })
      .where(eq(platformSettings.key, parsed.data.key));
  } else {
    await db.insert(platformSettings).values({
      key: parsed.data.key,
      value: parsed.data.value,
    });
  }

  return NextResponse.json({ key: parsed.data.key, value: parsed.data.value });
}
