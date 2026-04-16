import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { savedQueries } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { resolveApiUser } from "@/lib/api-auth";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  query: z.string().min(1).optional(),
  starred: z.boolean().optional(),
  shared: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Check existence and ownership
  const [existing] = await db
    .select()
    .from(savedQueries)
    .where(eq(savedQueries.id, id));
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [row] = await db
    .update(savedQueries)
    .set(parsed.data)
    .where(eq(savedQueries.id, id))
    .returning();

  return NextResponse.json(row);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check existence and ownership
  const [existing] = await db
    .select()
    .from(savedQueries)
    .where(eq(savedQueries.id, id));
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db
    .delete(savedQueries)
    .where(eq(savedQueries.id, id));

  return NextResponse.json({ deleted: true });
}
