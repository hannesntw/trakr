import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizationMembers, organizations } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const result = await requirePlatformAdmin(request);
  if ("error" in result) return result.error;

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? "20")));
  const search = url.searchParams.get("q") ?? "";

  const allUsers = await db.select().from(users);
  const allMembers = await db.select().from(organizationMembers);
  const allOrgs = await db.select().from(organizations);

  let filtered = allUsers;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const offset = (page - 1) * pageSize;
  const items = filtered.slice(offset, offset + pageSize).map((u) => {
    const memberships = allMembers.filter((m) => m.userId === u.id);
    const orgs = memberships.map((m) => {
      const org = allOrgs.find((o) => o.id === m.orgId);
      return { id: m.orgId, name: org?.name ?? "Unknown", role: m.role };
    });

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      orgs,
      isPlatformAdmin: u.isPlatformAdmin,
      createdAt: null,
    };
  });

  return NextResponse.json({ items, total, page, pageSize });
}
