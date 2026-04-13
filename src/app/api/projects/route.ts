import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { z } from "zod";
import { resolveApiUser } from "@/lib/api-auth";

const createSchema = z.object({
  name: z.string().min(1),
  key: z
    .string()
    .min(2)
    .max(5)
    .transform((v) => v.toUpperCase()),
  description: z.string().optional(),
  visibility: z.enum(["public", "private"]).optional(),
});

export async function GET() {
  const rows = await db.select().from(projects).orderBy(projects.name);
  return NextResponse.json(rows);
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
      visibility: parsed.data.visibility ?? "private",
      ownerId: user.id,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
