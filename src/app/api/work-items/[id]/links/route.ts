import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workItemLinks, workItems } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { emit } from "@/lib/events";

const createSchema = z.object({
  targetId: z.number().int().positive(),
  type: z.enum(["blocks", "blocked_by", "relates_to", "duplicates"]),
});

const INVERSE_TYPE: Record<string, string> = {
  blocks: "blocked_by",
  blocked_by: "blocks",
  relates_to: "relates_to",
  duplicates: "duplicates",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const workItemId = Number(id);

  const rows = await db
    .select()
    .from(workItemLinks)
    .where(
      or(
        eq(workItemLinks.sourceId, workItemId),
        eq(workItemLinks.targetId, workItemId)
      )
    )
    .orderBy(workItemLinks.createdAt);

  return NextResponse.json(rows);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sourceId = Number(id);

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { targetId, type } = parsed.data;

  if (sourceId === targetId) {
    return NextResponse.json(
      { error: "Cannot link a work item to itself" },
      { status: 400 }
    );
  }

  // Validate both work items exist
  const [source] = await db
    .select({ id: workItems.id })
    .from(workItems)
    .where(eq(workItems.id, sourceId));
  if (!source) {
    return NextResponse.json(
      { error: "Source work item not found" },
      { status: 404 }
    );
  }

  const [target] = await db
    .select({ id: workItems.id })
    .from(workItems)
    .where(eq(workItems.id, targetId));
  if (!target) {
    return NextResponse.json(
      { error: "Target work item not found" },
      { status: 404 }
    );
  }

  // Create the forward link
  const [row] = await db
    .insert(workItemLinks)
    .values({ sourceId, targetId, type })
    .returning();

  // Create the inverse link
  const inverseType = INVERSE_TYPE[type] as typeof type;
  const [inverse] = await db
    .insert(workItemLinks)
    .values({ sourceId: targetId, targetId: sourceId, type: inverseType })
    .returning();

  emit({ type: "link", action: "created", id: row.id, workItemId: sourceId });

  return NextResponse.json({ link: row, inverse }, { status: 201 });
}
