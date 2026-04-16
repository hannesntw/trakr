import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sprints } from "@/db/schema";
import { eq, and, SQL } from "drizzle-orm";
import { z } from "zod";
import { emit } from "@/lib/events";
import { resolveApiUser } from "@/lib/api-auth";
import { requireProjectAccess } from "@/lib/project-auth";

const createSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  goal: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.searchParams;
  const conditions: SQL[] = [];

  const projectId = url.get("projectId");
  if (projectId) {
    const access = await requireProjectAccess(projectId, user.id, "viewer");
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    conditions.push(eq(sprints.projectId, projectId));
  }

  const state = url.get("state");
  if (state)
    conditions.push(
      eq(sprints.state, state as "planning" | "active" | "closed")
    );

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(sprints).where(where).orderBy(sprints.id);
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

  // Check project access
  const access = await requireProjectAccess(parsed.data.projectId, user.id, "member");
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [row] = await db.insert(sprints).values(parsed.data).returning();
  emit({ type: "sprint", action: "created", id: row.id, projectId: row.projectId });
  return NextResponse.json(row, { status: 201 });
}
