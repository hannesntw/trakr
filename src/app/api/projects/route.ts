import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { emit } from "@/lib/events";
import { resolveApiUser } from "@/lib/api-auth";
import { applyPreset } from "@/lib/workflow-presets";

const createSchema = z.object({
  name: z.string().min(1),
  key: z
    .string()
    .min(2)
    .max(5)
    .transform((v) => v.toUpperCase()),
  description: z.string().optional(),
  makerMode: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const user = await resolveApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = request.nextUrl.searchParams.get("orgId");
  const allRows = orgId
    ? await db.select().from(projects).where(eq(projects.orgId, orgId)).orderBy(projects.name)
    : await db.select().from(projects).orderBy(projects.name);

  // Filter to projects the user can access
  const { resolveProjectAccess } = await import("@/lib/project-auth");
  const accessChecks = await Promise.all(
    allRows.map(async (p) => ({ project: p, access: await resolveProjectAccess(p.id, user.id) }))
  );
  return NextResponse.json(accessChecks.filter(({ access }) => access.allowed).map(({ project }) => project));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Require authenticated user to create a project
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [row] = await db
    .insert(projects)
    .values({
      ...parsed.data,
      ownerId: user.id,
      makerMode: parsed.data.makerMode ?? false,
    })
    .returning();

  // TRK-139: Auto-create simplified workflow for maker mode projects
  if (parsed.data.makerMode) {
    await applyPreset(row.id, "maker");
  }

  emit({ type: "project", action: "created", id: row.id, projectId: row.id });
  return NextResponse.json(row, { status: 201 });
}
