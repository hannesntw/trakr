import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { organizationInvitations, organizationMembers, organizations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Look up the invitation
  const [invitation] = await db
    .select()
    .from(organizationInvitations)
    .where(eq(organizationInvitations.token, token));

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-content-bg">
        <div className="max-w-md w-full bg-surface border border-border rounded-lg p-8 text-center space-y-4">
          <h1 className="text-lg font-semibold text-text-primary">Invalid Invitation</h1>
          <p className="text-sm text-text-tertiary">
            This invitation link is invalid or has already been used.
          </p>
          <Link href="/" className="inline-block px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm rounded-md transition-colors">
            Go to Stori
          </Link>
        </div>
      </div>
    );
  }

  // Check expiry
  const now = new Date().toISOString();
  if (invitation.expiresAt < now) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-content-bg">
        <div className="max-w-md w-full bg-surface border border-border rounded-lg p-8 text-center space-y-4">
          <h1 className="text-lg font-semibold text-text-primary">Invitation Expired</h1>
          <p className="text-sm text-text-tertiary">
            This invitation has expired. Please ask your organization admin to send a new one.
          </p>
          <Link href="/" className="inline-block px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm rounded-md transition-colors">
            Go to Stori
          </Link>
        </div>
      </div>
    );
  }

  // Check if user is logged in
  const session = await auth();
  if (!session?.user?.id) {
    // Redirect to login with a returnUrl
    redirect(`/login?returnUrl=/invite/${token}`);
  }

  // Get org info
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, invitation.orgId));

  // Check if already a member
  const [existingMember] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.orgId, invitation.orgId),
        eq(organizationMembers.userId, session.user.id)
      )
    );

  if (existingMember) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-content-bg">
        <div className="max-w-md w-full bg-surface border border-border rounded-lg p-8 text-center space-y-4">
          <h1 className="text-lg font-semibold text-text-primary">Already a Member</h1>
          <p className="text-sm text-text-tertiary">
            You are already a member of <strong>{org?.name ?? "this organization"}</strong>.
          </p>
          <Link href="/org" className="inline-block px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm rounded-md transition-colors">
            Go to Organization
          </Link>
        </div>
      </div>
    );
  }

  // Accept the invitation: add user to org
  await db.insert(organizationMembers).values({
    orgId: invitation.orgId,
    userId: session.user.id,
    role: invitation.role,
  });

  // Delete the invitation so it can't be reused
  await db
    .delete(organizationInvitations)
    .where(eq(organizationInvitations.id, invitation.id));

  return (
    <div className="min-h-screen flex items-center justify-center bg-content-bg">
      <div className="max-w-md w-full bg-surface border border-border rounded-lg p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto text-xl">
          &#10003;
        </div>
        <h1 className="text-lg font-semibold text-text-primary">Welcome!</h1>
        <p className="text-sm text-text-tertiary">
          You have joined <strong>{org?.name ?? "the organization"}</strong> as a <strong>{invitation.role}</strong>.
        </p>
        <Link href="/org" className="inline-block px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm rounded-md transition-colors">
          Go to Organization
        </Link>
      </div>
    </div>
  );
}
