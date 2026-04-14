import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizationMembers, users } from "@/db/schema";
import { eq, and, or, ilike } from "drizzle-orm";
import { z } from "zod";
import { resolveApiUser } from "@/lib/api-auth";
import { requireOrgRole, resolveOrgMember } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";

const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["admin", "member", "viewer", "guest"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const orgId = Number(id);

  // Must be at least a member to view
  const member = await resolveOrgMember(orgId, user.id);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? "10")));
  const q = url.searchParams.get("q") ?? "";

  // Get all members for this org
  const allMembers = await db
    .select({
      id: organizationMembers.id,
      orgId: organizationMembers.orgId,
      userId: organizationMembers.userId,
      role: organizationMembers.role,
      joinedAt: organizationMembers.joinedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(eq(organizationMembers.orgId, orgId));

  // Filter by search query
  let filtered = allMembers;
  if (q) {
    const lower = q.toLowerCase();
    filtered = allMembers.filter(
      m => m.userName?.toLowerCase().includes(lower) || m.userEmail?.toLowerCase().includes(lower)
    );
  }

  const total = filtered.length;
  const offset = (page - 1) * pageSize;
  const items = filtered.slice(offset, offset + pageSize);

  return NextResponse.json({
    items: items.map(m => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      user: { name: m.userName, email: m.userEmail },
    })),
    total,
    page,
    pageSize,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const orgId = Number(id);

  // Only admin+ can add members
  const member = await requireOrgRole(orgId, user.id, "admin");
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Check user exists
  const [targetUser] = await db.select().from(users).where(eq(users.id, parsed.data.userId));
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check not already a member
  const existing = await resolveOrgMember(orgId, parsed.data.userId);
  if (existing) {
    return NextResponse.json({ error: "Already a member" }, { status: 409 });
  }

  const role = parsed.data.role ?? "member";

  const [row] = await db
    .insert(organizationMembers)
    .values({ orgId, userId: parsed.data.userId, role })
    .returning();

  logAudit({
    orgId,
    actorId: user.id,
    actorName: user.name ?? user.email ?? undefined,
    action: "member.added",
    targetType: "member",
    targetId: parsed.data.userId,
    description: `Added ${targetUser.name ?? targetUser.email ?? parsed.data.userId} as ${role}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({
    id: row.id,
    userId: row.userId,
    role: row.role,
    joinedAt: row.joinedAt,
    user: { name: targetUser.name, email: targetUser.email },
  }, { status: 201 });
}
