import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, workflowStates } from "@/db/schema";
import { eq, and, asc, max } from "drizzle-orm";
import { z } from "zod";
import { PRESETS, applyPreset } from "@/lib/workflow-presets";

const createSchema = z.object({
  displayName: z.string().min(1),
  category: z.enum(["todo", "in_progress", "done"]),
  color: z.string().optional(),
});

const presetSchema = z.object({
  preset: z.enum(["simple", "standard", "delivery_pipeline"]),
});

function toSlug(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const states = await db
    .select({
      id: workflowStates.id,
      slug: workflowStates.slug,
      displayName: workflowStates.displayName,
      position: workflowStates.position,
      category: workflowStates.category,
      color: workflowStates.color,
    })
    .from(workflowStates)
    .where(eq(workflowStates.projectId, projectId))
    .orderBy(asc(workflowStates.position));

  return NextResponse.json(states);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();

  // Check if this is a preset application
  const presetParsed = presetSchema.safeParse(body);
  if (presetParsed.success) {
    const states = await applyPreset(projectId, presetParsed.data.preset);
    return NextResponse.json(states, { status: 201 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const slug = toSlug(parsed.data.displayName);
  if (!slug) {
    return NextResponse.json(
      { error: "Display name must produce a valid slug" },
      { status: 400 }
    );
  }

  // Check slug uniqueness within project
  const [existing] = await db
    .select({ id: workflowStates.id })
    .from(workflowStates)
    .where(
      and(
        eq(workflowStates.projectId, projectId),
        eq(workflowStates.slug, slug)
      )
    );
  if (existing) {
    return NextResponse.json(
      { error: `Slug "${slug}" already exists in this project` },
      { status: 409 }
    );
  }

  // Get max position
  const [maxRow] = await db
    .select({ maxPos: max(workflowStates.position) })
    .from(workflowStates)
    .where(eq(workflowStates.projectId, projectId));
  const nextPosition = (maxRow?.maxPos ?? -1) + 1;

  const [row] = await db
    .insert(workflowStates)
    .values({
      projectId,
      slug,
      displayName: parsed.data.displayName,
      position: nextPosition,
      category: parsed.data.category,
      color: parsed.data.color ?? "#9CA3AF",
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
