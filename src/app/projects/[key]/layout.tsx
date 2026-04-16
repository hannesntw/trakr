import { db } from "@/db";
import { projects, organizationMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { auth, signOut } from "@/auth";
import { isPlatformAdmin } from "@/lib/admin-auth";
import { resolveProjectAccess } from "@/lib/project-auth";

export const dynamic = "force-dynamic";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ key: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { key } = await params;
  const allProjects = await db.select().from(projects).orderBy(projects.name);
  const userId = session.user!.id!;

  // Filter to projects the user can access (owner, org admin, team grant, invite, or public)
  const accessChecks = await Promise.all(
    allProjects.map(async (p) => ({
      project: p,
      access: await resolveProjectAccess(p.id, userId),
    }))
  );
  const visibleProjects = accessChecks
    .filter(({ access }) => access.allowed)
    .map(({ project }) => project);

  const currentProject = visibleProjects.find(
    (p) => p.key === key.toUpperCase()
  );

  if (!currentProject) {
    notFound();
  }

  // Check if user belongs to an org
  const orgMemberships = await db
    .select({ orgId: organizationMembers.orgId })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, session.user!.id!));
  const hasOrg = orgMemberships.length > 0;
  const isAdmin = await isPlatformAdmin(session.user!.id!);

  return (
    <div className="h-full flex">
      <RealtimeRefresh />
      <KeyboardShortcuts />
      <Sidebar
        projects={visibleProjects}
        currentProjectKey={currentProject.key}
        user={session.user}
        hasOrg={hasOrg}
        isPlatformAdmin={isAdmin}
        signOutAction={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      />
      <main className="flex-1 flex flex-col min-w-0 bg-content-bg">
        {children}
      </main>
    </div>
  );
}
