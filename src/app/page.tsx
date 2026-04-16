import { redirect } from "next/navigation";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { auth } from "@/auth";
import { HomeRedirect } from "./home-redirect";
import { resolveProjectAccess } from "@/lib/project-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allProjects = await db.select({ id: projects.id, key: projects.key }).from(projects).orderBy(projects.name);
  const userId = session.user.id!;

  const accessChecks = await Promise.all(
    allProjects.map(async (p) => ({
      key: p.key,
      access: await resolveProjectAccess(p.id, userId),
    }))
  );
  const keys = accessChecks.filter(({ access }) => access.allowed).map(({ key }) => key);

  if (keys.length === 0) redirect("/login");

  return <HomeRedirect projectKeys={keys} />;
}
