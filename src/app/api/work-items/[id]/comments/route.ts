import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { emit } from "@/lib/events";
import { resolveApiUser } from "@/lib/api-auth";

const createSchema = z.object({
  author: z.string().min(1).optional(),
  body: z.string().min(1),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rows = await db
    .select()
    .from(comments)
    .where(eq(comments.workItemId, Number(id)))
    .orderBy(comments.createdAt);
  return NextResponse.json(rows);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Use session/API user name if author not provided
  let author = parsed.data.author;
  if (!author) {
    const user = await resolveApiUser(request);
    author = user?.name ?? "Anonymous";
  }

  const [row] = await db
    .insert(comments)
    .values({ author, body: parsed.data.body, workItemId: Number(id) })
    .returning();
  emit({ type: "comment", action: "created", id: row.id, workItemId: Number(id) });
  return NextResponse.json(row, { status: 201 });
}
