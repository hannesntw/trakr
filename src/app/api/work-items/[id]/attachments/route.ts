import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { emit } from "@/lib/events";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rows = await db
    .select({
      id: attachments.id,
      workItemId: attachments.workItemId,
      filename: attachments.filename,
      contentType: attachments.contentType,
      createdAt: attachments.createdAt,
    })
    .from(attachments)
    .where(eq(attachments.workItemId, Number(id)))
    .orderBy(attachments.createdAt);
  return NextResponse.json(rows);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const [row] = await db
    .insert(attachments)
    .values({
      workItemId: Number(id),
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

  emit({ type: "attachment", action: "created", id: row.id, workItemId: Number(id) });
  return NextResponse.json(row, { status: 201 });
}
