import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workItems, projects } from "@/db/schema";
import { eq, and, like, sql, SQL } from "drizzle-orm";
import { z } from "zod";
import { emit } from "@/lib/events";
import { resolveApiUser } from "@/lib/api-auth";

const createSchema = z.object({
  projectId: z.number().int().positive(),
  title: z.string().min(1),
  type: z.enum(["epic", "feature", "story", "bug", "task"]),
  state: z.string().optional(),
  description: z.string().optional(),
  parentId: z.number().int().positive().nullable().optional(),
  sprintId: z.number().int().positive().nullable().optional(),
  assignee: z.string().nullable().optional(),
  points: z.number().int().refine((v) => [1, 2, 3, 5, 8, 13].includes(v), {
    message: "Points must be one of: 1, 2, 3, 5, 8, 13",
  }).nullable().optional(),
  priority: z.number().int().optional(),
});

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams;
  const conditions: SQL[] = [];

  const projectId = url.get("projectId");
  if (projectId) conditions.push(eq(workItems.projectId, Number(projectId)));

  const type = url.get("type");
  if (type) conditions.push(eq(workItems.type, type as "epic" | "feature" | "story"));

  const state = url.get("state");
  if (state) conditions.push(eq(workItems.state, state));

  const sprintId = url.get("sprintId");
  if (sprintId) conditions.push(eq(workItems.sprintId, Number(sprintId)));

  const parentId = url.get("parentId");
  if (parentId) conditions.push(eq(workItems.parentId, Number(parentId)));

  const q = url.get("q");
  if (q) conditions.push(like(workItems.title, `%${q}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db
    .select()
    .from(workItems)
    .where(where)
    .orderBy(workItems.priority, workItems.id);

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  // Require authenticated user
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Generate displayId from project key + sequence (atomic increment)
  const [project] = await db
    .update(projects)
    .set({ sequence: sql`${projects.sequence} + 1` })
    .where(eq(projects.id, parsed.data.projectId))
    .returning({ key: projects.key, sequence: projects.sequence });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const displayId = `${project.key}-${project.sequence}`;

  const [row] = await db.insert(workItems).values({ ...parsed.data, displayId }).returning();
  emit({ type: "work-item", action: "created", id: row.id });
  return NextResponse.json(row, { status: 201 });
}
