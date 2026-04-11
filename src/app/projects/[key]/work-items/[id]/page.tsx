import { db } from "@/db";
import { workItems, projects, sprints } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { WorkItemDetailFull } from "./detail-client";

export const dynamic = "force-dynamic";

export default async function WorkItemDetailPage({
  params,
}: {
  params: Promise<{ key: string; id: string }>;
}) {
  const { key, id } = await params;
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.key, key.toUpperCase()));
  if (!project) notFound();

  const [item] = await db
    .select()
    .from(workItems)
    .where(eq(workItems.id, Number(id)));
  if (!item || item.projectId !== project.id) notFound();

  return (
    <WorkItemDetailFull
      workItemId={item.id}
      projectId={project.id}
      projectKey={project.key}
      projectName={project.name}
    />
  );
}
