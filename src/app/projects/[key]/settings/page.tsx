import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { SettingsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const session = await auth();
  const { key } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.key, key.toUpperCase()));

  if (!project || project.ownerId !== session?.user?.id) {
    notFound();
  }

  return <SettingsClient project={project} />;
}
