import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizationInvitations, organizations, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { Resend } from "resend";
import { resolveApiUser } from "@/lib/api-auth";
import { requireOrgRole, checkIpAllowlist } from "@/lib/org-auth";
import { logAudit, getClientIp } from "@/lib/audit";

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

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

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

  const ipBlock = await checkIpAllowlist(orgId, request);
  if (ipBlock) return ipBlock;

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

  // Send invite email via Resend
  const baseUrl = process.env.NEXTAUTH_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3100");
  const inviteUrl = `${baseUrl}/invite/${token}`;

  // Look up org name and inviter name for the email
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
  const [inviter] = await db.select().from(users).where(eq(users.id, user.id));
  const inviterName = inviter?.name ?? inviter?.email ?? "Someone";
  const orgName = org?.name ?? "an organization";
  const role = parsed.data.role ?? "member";

  try {
    const resend = new Resend(process.env.AUTH_RESEND_KEY);
    await resend.emails.send({
      from: process.env.AUTH_EMAIL_FROM ?? "Stori <noreply@resend.dev>",
      to: parsed.data.email,
      subject: `You're invited to join ${orgName} on Stori`,
      html: `<p><strong>${inviterName}</strong> invited you to join <strong>${orgName}</strong> on Stori.</p>
        <p>Role: ${role}</p>
        <p><a href="${inviteUrl}">Accept invitation</a></p>
        <p>This invitation expires in 7 days.</p>`,
    });
  } catch (err) {
    console.error("[org-invite] Failed to send email:", err);
    // Don't fail the request — the invitation is still created
  }

  console.log(`[org-invite] Invite for ${parsed.data.email} to org ${orgId}: ${inviteUrl}`);

  logAudit({
    orgId,
    actorId: user.id,
    actorName: user.name ?? user.email ?? undefined,
    action: "member.invited",
    targetType: "member",
    targetId: parsed.data.email,
    description: `Invited ${parsed.data.email} as ${role}`,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ ...row, inviteUrl }, { status: 201 });
}
