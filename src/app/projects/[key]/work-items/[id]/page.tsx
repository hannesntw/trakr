import { db } from "@/db";
import { workItems, projects } from "@/db/schema";
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

  // Accept either numeric id or displayId (e.g. "TRK-5")
  let item;
  if (id.includes("-")) {
    const [row] = await db
      .select()
      .from(workItems)
      .where(eq(workItems.displayId, id.toUpperCase()));
    item = row;
  } else {
    const [row] = await db
      .select()
      .from(workItems)
      .where(eq(workItems.id, id));
    item = row;
  }

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
