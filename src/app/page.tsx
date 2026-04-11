import { redirect } from "next/navigation";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { auth } from "@/auth";
import { HomeRedirect } from "./home-redirect";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allProjects = await db.select({ key: projects.key }).from(projects).orderBy(projects.name);
  const keys = allProjects.map(p => p.key);

  if (keys.length === 0) redirect("/login");

  return <HomeRedirect projectKeys={keys} />;
}
