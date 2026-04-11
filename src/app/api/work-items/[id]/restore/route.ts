import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workItems, workItemSnapshots } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const restoreSchema = z.object({
  version: z.number().int().min(0),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = restoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Find the snapshot to restore
  const [snapshot] = await db
    .select()
    .from(workItemSnapshots)
    .where(
      and(
        eq(workItemSnapshots.workItemId, Number(id)),
        eq(workItemSnapshots.version, parsed.data.version)
      )
    );

  if (!snapshot) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  const snapshotData = JSON.parse(snapshot.snapshot);

  // Apply the snapshot fields via internal PATCH (which triggers a new snapshot)
  const channel = request.headers.get("x-trakr-channel") ?? "api";
  const internalRes = await fetch(`${request.nextUrl.origin}/api/work-items/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Trakr-Channel": channel,
    },
    body: JSON.stringify({
      title: snapshotData.title,
      description: snapshotData.description,
      state: snapshotData.state,
      assignee: snapshotData.assignee,
      sprintId: snapshotData.sprintId,
      points: snapshotData.points,
      priority: snapshotData.priority,
    }),
  });

  if (!internalRes.ok) {
    return NextResponse.json({ error: "Restore failed" }, { status: 500 });
  }

  const restored = await internalRes.json();
  return NextResponse.json({ restored, fromVersion: parsed.data.version });
}
