import { redirect } from "next/navigation";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allProjects = await db.select().from(projects).limit(1);
  if (allProjects.length > 0) {
    redirect(`/projects/${allProjects[0].key}/board`);
  }
  redirect("/login");
}
