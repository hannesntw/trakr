import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workItemSnapshots, workItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveApiUser } from "@/lib/api-auth";
import { requireProjectAccess } from "@/lib/project-auth";

/** Resolve a work item ID parameter — accepts CUID2 id or displayId like "STRI-5" */
async function resolveId(idParam: string): Promise<string | null> {
  if (idParam.includes("-")) {
    const [row] = await db
      .select({ id: workItems.id })
      .from(workItems)
      .where(eq(workItems.displayId, idParam.toUpperCase()));
    return row?.id ?? null;
  }
  return idParam;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const resolvedId = await resolveId(id);
  if (!resolvedId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [wi] = await db.select({ projectId: workItems.projectId }).from(workItems).where(eq(workItems.id, resolvedId));
  if (!wi) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await requireProjectAccess(wi.projectId, user.id, "viewer");
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db
    .select()
    .from(workItemSnapshots)
    .where(eq(workItemSnapshots.workItemId, resolvedId))
    .orderBy(workItemSnapshots.version);

  // Parse snapshot JSON for each row
  const parsed = rows.map((r) => ({
    ...r,
    snapshot: JSON.parse(r.snapshot),
  }));

  return NextResponse.json(parsed);
}
