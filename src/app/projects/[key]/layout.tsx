import { db } from "@/db";
import { projects, projectInvites } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { auth, signOut } from "@/auth";

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

  // Filter: public projects + private projects user owns or is invited to
  const userEmail = session.user.email ?? "";
  const invites = await db
    .select({ projectId: projectInvites.projectId })
    .from(projectInvites)
    .where(eq(projectInvites.email, userEmail));
  const invitedIds = new Set(invites.map((i) => i.projectId));

  const visibleProjects = allProjects.filter(
    (p) =>
      p.visibility === "public" ||
      p.ownerId === session.user!.id ||
      invitedIds.has(p.id)
  );

  const currentProject = visibleProjects.find(
    (p) => p.key === key.toUpperCase()
  );

  if (!currentProject) {
    notFound();
  }

  return (
    <div className="h-full flex">
      <RealtimeRefresh />
      <KeyboardShortcuts />
      <Sidebar
        projects={visibleProjects}
        currentProjectKey={currentProject.key}
        user={session.user}
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
