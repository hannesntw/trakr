import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projectInvites, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { Resend } from "resend";
import { resolveApiUser } from "@/lib/api-auth";

const resend = new Resend(process.env.AUTH_RESEND_KEY);

const createSchema = z.object({
  email: z.string().email(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rows = await db
    .select()
    .from(projectInvites)
    .where(eq(projectInvites.projectId, Number(id)))
    .orderBy(projectInvites.createdAt);
  return NextResponse.json(rows);
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
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Save invite
  const [row] = await db
    .insert(projectInvites)
    .values({ projectId: Number(id), email: parsed.data.email })
    .returning();

  // Get project name for the email
  const [project] = await db.select().from(projects).where(eq(projects.id, Number(id)));
  const projectName = project?.name ?? "a project";
  const appUrl = process.env.AUTH_URL ?? "http://localhost:3100";

  // Send invite email
  try {
    await resend.emails.send({
      from: process.env.AUTH_EMAIL_FROM ?? "Stori <noreply@resend.dev>",
      to: parsed.data.email,
      subject: `You've been invited to ${projectName} on Stori`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="font-size: 20px; margin-bottom: 8px;">You're invited to <strong>${projectName}</strong></h2>
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            Someone invited you to collaborate on their project in Stori. Sign in to get started.
          </p>
          <a href="${appUrl}/login" style="display: inline-block; margin-top: 16px; padding: 10px 24px; background: #6366F1; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
            Sign in to Stori
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            If you didn't expect this invitation, you can ignore this email.
          </p>
        </div>
      `,
    });
  } catch (e) {
    // Don't fail the invite if email fails — the invite is still saved
    console.error("Failed to send invite email:", e);
  }

  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { email } = await request.json();
  await db
    .delete(projectInvites)
    .where(eq(projectInvites.projectId, Number(id)));
  return NextResponse.json({ deleted: true });
}
