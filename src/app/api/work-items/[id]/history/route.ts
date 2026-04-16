import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { statusHistory, workItems } from "@/db/schema";
import { eq } from "drizzle-orm";

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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const resolvedId = await resolveId(id);
  if (!resolvedId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const rows = await db
    .select()
    .from(statusHistory)
    .where(eq(statusHistory.workItemId, resolvedId))
    .orderBy(statusHistory.changedAt);
  return NextResponse.json(rows);
}
