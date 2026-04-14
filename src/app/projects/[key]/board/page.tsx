import { Suspense } from "react";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { BoardClient } from "./client";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.key, key.toUpperCase()));
  if (!project) notFound();

  return (
    <Suspense>
      <BoardClient
        projectId={project.id}
        projectKey={project.key}
        projectName={project.name}
      />
    </Suspense>
  );
}
