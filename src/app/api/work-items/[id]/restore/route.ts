import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workItems, workItemSnapshots } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
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

const restoreSchema = z.object({
  version: z.number().int().min(0),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idParam } = await params;
  const id = await resolveId(idParam);
  if (!id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [wi] = await db.select({ projectId: workItems.projectId }).from(workItems).where(eq(workItems.id, id));
  if (!wi) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await requireProjectAccess(wi.projectId, user.id, "member");
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
        eq(workItemSnapshots.workItemId, id),
        eq(workItemSnapshots.version, parsed.data.version)
      )
    );

  if (!snapshot) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  const snapshotData = JSON.parse(snapshot.snapshot);

  // Apply the snapshot fields via internal PATCH (which triggers a new snapshot)
  const channel = request.headers.get("x-stori-channel") ?? "api";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Stori-Channel": channel,
  };
  // Forward auth header so the internal PATCH call is authenticated
  const authHeader = request.headers.get("authorization");
  if (authHeader) headers["Authorization"] = authHeader;
  const cookie = request.headers.get("cookie");
  if (cookie) headers["Cookie"] = cookie;

  const internalRes = await fetch(`${request.nextUrl.origin}/api/work-items/${id}`, {
    method: "PATCH",
    headers,
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
