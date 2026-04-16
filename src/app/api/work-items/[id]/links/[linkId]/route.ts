import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workItemLinks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { emit } from "@/lib/events";
import { resolveApiUser } from "@/lib/api-auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, linkId } = await params;
  const workItemId = id;

  // Find the link to delete
  const [link] = await db
    .select()
    .from(workItemLinks)
    .where(eq(workItemLinks.id, linkId));

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  // Verify the link belongs to this work item (as source)
  if (link.sourceId !== workItemId) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  // Find and delete the inverse link
  const INVERSE_TYPE: Record<string, string> = {
    blocks: "blocked_by",
    blocked_by: "blocks",
    relates_to: "relates_to",
    duplicates: "duplicates",
  };
  const inverseType = INVERSE_TYPE[link.type] as typeof link.type;

  await db
    .delete(workItemLinks)
    .where(
      and(
        eq(workItemLinks.sourceId, link.targetId),
        eq(workItemLinks.targetId, link.sourceId),
        eq(workItemLinks.type, inverseType)
      )
    );

  // Delete the link itself
  await db
    .delete(workItemLinks)
    .where(eq(workItemLinks.id, linkId));

  emit({ type: "link", action: "deleted", id: link.id, workItemId });

  return NextResponse.json({ deleted: true });
}
