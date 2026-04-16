import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { savedQueries, users } from "@/db/schema";
import { eq, and, or, SQL } from "drizzle-orm";
import { z } from "zod";
import { resolveApiUser } from "@/lib/api-auth";

const createSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  query: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.searchParams;
  const projectId = url.get("projectId");
  if (!projectId) {
    return NextResponse.json(
      { error: "projectId query parameter is required" },
      { status: 400 }
    );
  }

  // Return user's own queries + shared queries from others in this project
  const rows = await db
    .select({
      id: savedQueries.id,
      projectId: savedQueries.projectId,
      userId: savedQueries.userId,
      name: savedQueries.name,
      query: savedQueries.query,
      starred: savedQueries.starred,
      shared: savedQueries.shared,
      createdAt: savedQueries.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(savedQueries)
    .leftJoin(users, eq(savedQueries.userId, users.id))
    .where(
      and(
        eq(savedQueries.projectId, projectId),
        or(
          eq(savedQueries.userId, user.id),
          eq(savedQueries.shared, true)
        )
      )
    )
    .orderBy(savedQueries.name);

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
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

  const [row] = await db
    .insert(savedQueries)
    .values({
      projectId: parsed.data.projectId,
      userId: user.id,
      name: parsed.data.name,
      query: parsed.data.query,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
