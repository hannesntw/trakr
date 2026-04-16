import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { comments, workItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { emit } from "@/lib/events";
import { resolveApiUser } from "@/lib/api-auth";

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

const createSchema = z.object({
  author: z.string().min(1).optional(),
  body: z.string().min(1),
});

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
    .from(comments)
    .where(eq(comments.workItemId, resolvedId))
    .orderBy(comments.createdAt);
  return NextResponse.json(rows);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const resolvedId = await resolveId(id);
  if (!resolvedId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
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
    author = user?.name ?? user?.email ?? "Anonymous";
  }

  const [row] = await db
    .insert(comments)
    .values({ author, body: parsed.data.body, workItemId: resolvedId })
    .returning();
  emit({ type: "comment", action: "created", id: row.id, workItemId: resolvedId });
  return NextResponse.json(row, { status: 201 });
}
