import { NextRequest } from "next/server";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [row] = await db
    .select()
    .from(attachments)
    .where(eq(attachments.id, Number(id)));

  if (!row) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.contentType,
      "Content-Disposition": `inline; filename="${row.filename}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [row] = await db
    .delete(attachments)
    .where(eq(attachments.id, Number(id)))
    .returning();
  if (!row) {
    return new Response("Not found", { status: 404 });
  }
  return Response.json({ deleted: true });
}
