import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attachments, workItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { emit } from "@/lib/events";
import { resolveApiUser } from "@/lib/api-auth";

/** Resolve displayId like "STRI-5" to the actual CUID2 id */
async function resolveId(idParam: string): Promise<string | null> {
  if (idParam.includes("-")) {
    const [row] = await db.select({ id: workItems.id }).from(workItems).where(eq(workItems.displayId, idParam.toUpperCase()));
    return row?.id ?? null;
  }
  return idParam;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const workItemId = await resolveId((await params).id);
  if (!workItemId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rows = await db
    .select({
      id: attachments.id,
      workItemId: attachments.workItemId,
      filename: attachments.filename,
      contentType: attachments.contentType,
      createdAt: attachments.createdAt,
    })
    .from(attachments)
    .where(eq(attachments.workItemId, workItemId))
    .orderBy(attachments.createdAt);
  return NextResponse.json(rows);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workItemId = await resolveId((await params).id);
  if (!workItemId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const [row] = await db
    .insert(attachments)
    .values({
      workItemId,
      filename: file.name,
      contentType: file.type,
      data: buffer,
    })
    .returning({
      id: attachments.id,
      workItemId: attachments.workItemId,
      filename: attachments.filename,
      contentType: attachments.contentType,
      createdAt: attachments.createdAt,
    });

  emit({ type: "attachment", action: "created", id: row.id, workItemId });
  return NextResponse.json(row, { status: 201 });
}
