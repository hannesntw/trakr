import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { statusHistory } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rows = await db
    .select()
    .from(statusHistory)
    .where(eq(statusHistory.workItemId, id))
    .orderBy(statusHistory.changedAt);
  return NextResponse.json(rows);
}
