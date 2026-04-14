import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizationInvitations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { resolveApiUser } from "@/lib/api-auth";
import { requireOrgRole } from "@/lib/org-auth";

const createSchema = z.object({
  email: z.string().email(),
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

  // Only admin+ can view invitations
  const member = await requireOrgRole(orgId, user.id, "admin");
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select()
    .from(organizationInvitations)
    .where(eq(organizationInvitations.orgId, orgId));

  // Filter out expired invitations
  const now = new Date().toISOString();
  const pending = rows.filter(r => r.expiresAt > now);

  return NextResponse.json(pending);
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

  // Only admin+ can invite
  const member = await requireOrgRole(orgId, user.id, "admin");
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const [row] = await db
    .insert(organizationInvitations)
    .values({
      orgId,
      email: parsed.data.email,
      role: parsed.data.role ?? "member",
      token,
      expiresAt,
    })
    .returning();

  // Stub: log the invite URL instead of sending email
  const inviteUrl = `/invite/${token}`;
  console.log(`[org-invite] Invite for ${parsed.data.email} to org ${orgId}: ${inviteUrl}`);

  return NextResponse.json({ ...row, inviteUrl }, { status: 201 });
}
