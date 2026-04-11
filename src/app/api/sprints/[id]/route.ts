import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sprints } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { emit } from "@/lib/events";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  goal: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  state: z.enum(["planning", "active", "closed"]).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [row] = await db
    .select()
    .from(sprints)
    .where(eq(sprints.id, Number(id)));
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(row);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const [row] = await db
    .update(sprints)
    .set(parsed.data)
    .where(eq(sprints.id, Number(id)))
    .returning();
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  emit({ type: "sprint", action: "updated", id: row.id });
  return NextResponse.json(row);
}
