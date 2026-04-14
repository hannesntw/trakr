import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, organizationMembers, projects } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const result = await requirePlatformAdmin(request);
  if ("error" in result) return result.error;

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? "20")));
  const search = url.searchParams.get("q") ?? "";
  const planFilter = url.searchParams.get("plan") ?? "";

  const allOrgs = await db.select().from(organizations);
  const allMembers = await db.select().from(organizationMembers);
  const allProjects = await db.select({ id: projects.id, orgId: projects.orgId }).from(projects);

  let filtered = allOrgs;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (o) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q)
    );
  }
  if (planFilter) {
    filtered = filtered.filter((o) => o.plan === planFilter);
  }

  const total = filtered.length;
  const offset = (page - 1) * pageSize;
  const items = filtered.slice(offset, offset + pageSize).map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    plan: org.plan,
    ownerId: org.ownerId,
    memberCount: allMembers.filter((m) => m.orgId === org.id).length,
    projectCount: allProjects.filter((p) => p.orgId === org.id).length,
    status: "active" as const,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  }));

  return NextResponse.json({ items, total, page, pageSize });
}
