import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, users, projects, workItems } from "@/db/schema";
import { sql } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const result = await requirePlatformAdmin(request);
  if ("error" in result) return result.error;

  const dbStart = Date.now();

  const [allOrgs, allUsers, allProjects, allWorkItems, dbSizeResult] = await Promise.all([
    db.select().from(organizations),
    db.select().from(users),
    db.select().from(projects),
    db.select({ id: workItems.id }).from(workItems),
    db.execute(sql`SELECT pg_database_size(current_database()) as size`),
  ]);

  const dbResponseMs = Date.now() - dbStart;
  const dbSizeBytes = Number((dbSizeResult as unknown as Array<{ size: string }>)[0]?.size ?? 0);
  const dbSizeMb = dbSizeBytes / (1024 * 1024);

  const recentSignups = allUsers
    .slice(-10)
    .reverse()
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
    }));

  return NextResponse.json({
    totalOrgs: allOrgs.length,
    totalUsers: allUsers.length,
    totalProjects: allProjects.length,
    totalWorkItems: allWorkItems.length,
    recentSignups,
    systemHealth: {
      status: "healthy",
      apiResponseMs: dbResponseMs,
      dbSizeMb,
    },
  });
}
