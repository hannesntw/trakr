import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workItemSnapshots } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rows = await db
    .select()
    .from(workItemSnapshots)
    .where(eq(workItemSnapshots.workItemId, Number(id)))
    .orderBy(workItemSnapshots.version);

  // Parse snapshot JSON for each row
  const parsed = rows.map((r) => ({
    ...r,
    snapshot: JSON.parse(r.snapshot),
  }));

  return NextResponse.json(parsed);
}
