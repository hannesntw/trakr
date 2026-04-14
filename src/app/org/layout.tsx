import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { db } from "@/db";
import { organizationMembers, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function OrgLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Find the user's first org membership
  const memberships = await db
    .select({ orgId: organizationMembers.orgId, role: organizationMembers.role })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, session.user.id!));

  if (memberships.length === 0) {
    // No org: for now redirect back to home
    redirect("/");
  }

  const orgId = memberships[0].orgId;
  const userRole = memberships[0].role;

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
  if (!org) redirect("/");

  return (
    <div className="h-full flex">
      <aside className="w-60 bg-sidebar-bg text-sidebar-text flex flex-col shrink-0 border-r border-sidebar-border">
        <div className="h-14 flex items-center border-b border-sidebar-border pl-4">
          <svg width="20" height="20" viewBox="0 0 32 32" className="mr-2">
            <rect width="32" height="32" rx="6" fill="#6366F1"/>
            <rect x="7" y="8" width="5" height="16" rx="1.5" fill="white" opacity="0.9"/>
            <rect x="14" y="12" width="5" height="12" rx="1.5" fill="white" opacity="0.7"/>
            <rect x="21" y="10" width="5" height="14" rx="1.5" fill="white" opacity="0.5"/>
          </svg>
          <span className="font-semibold text-sidebar-text-active text-sm">Stori</span>
        </div>
        <div className="px-3 py-3">
          <Link href="/" className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to projects
          </Link>
        </div>
        <div className="px-3 py-1">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Building2 className="w-4 h-4 text-sidebar-text" />
            <span className="text-xs text-sidebar-text-active font-medium truncate">{org.name}</span>
          </div>
        </div>
        <div className="flex-1" />
        <div className="border-t border-sidebar-border py-2 px-3">
          <div className="flex items-center gap-2.5 pl-1 py-1.5 group">
            {session.user.image ? (
              <img src={session.user.image} alt="" className="w-6 h-6 rounded-full shrink-0" />
            ) : (
              <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">
                {(session.user.name ?? session.user.email ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
            <span className="text-xs text-sidebar-text-active truncate flex-1">
              {session.user.name ?? session.user.email}
            </span>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
              <button type="submit" className="text-[10px] text-sidebar-text opacity-0 group-hover:opacity-100 hover:text-sidebar-text-active transition-opacity">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 bg-content-bg">
        {/* Pass org data to children via a hidden script tag for client components */}
        <script
          id="org-data"
          type="application/json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({ id: org.id, name: org.name, slug: org.slug, plan: org.plan, role: userRole }),
          }}
        />
        {children}
      </main>
    </div>
  );
}
