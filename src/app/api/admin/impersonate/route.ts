import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin-auth";
import { z } from "zod";

const postSchema = z.object({
  targetUserId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const result = await requirePlatformAdmin(request);
  if ("error" in result) return result.error;

  const body = await request.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // STUB: Log the impersonation intent but do not switch sessions
  console.log(
    `[ADMIN IMPERSONATION] Admin ${result.user.id} (${result.user.email}) requested to impersonate user ${parsed.data.targetUserId}`
  );

  return NextResponse.json({
    ok: true,
    note: "Impersonation is a stub. The intent has been logged.",
    targetUserId: parsed.data.targetUserId,
    adminUserId: result.user.id,
  });
}

export async function DELETE(request: NextRequest) {
  const result = await requirePlatformAdmin(request);
  if ("error" in result) return result.error;

  console.log(
    `[ADMIN IMPERSONATION] Admin ${result.user.id} (${result.user.email}) stopped impersonation`
  );

  return NextResponse.json({
    ok: true,
    note: "Impersonation stopped (stub).",
  });
}
