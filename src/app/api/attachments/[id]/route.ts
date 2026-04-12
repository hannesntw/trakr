import { NextRequest } from "next/server";
import { db } from "@/db";
import { attachments, workItems, projects, projectInvites } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { resolveApiUser } from "@/lib/api-auth";

/**
 * Check whether a user has access to the project that owns a given attachment.
 * Returns { allowed: true, row } or { allowed: false, status, message }.
 */
async function authorizeAttachmentAccess(
  request: NextRequest,
  attachmentId: number
): Promise<
  | { allowed: true; row: typeof attachments.$inferSelect }
  | { allowed: false; status: number; message: string }
> {
  const user = await resolveApiUser(request);
  if (!user) {
    return { allowed: false, status: 401, message: "Unauthorized" };
  }

  // Fetch the attachment and join through workItems to get the project
  const [result] = await db
    .select({
      attachment: attachments,
      projectId: workItems.projectId,
    })
    .from(attachments)
    .innerJoin(workItems, eq(workItems.id, attachments.workItemId))
    .where(eq(attachments.id, attachmentId));

  if (!result) {
    return { allowed: false, status: 404, message: "Not found" };
  }

  // Get the project to check visibility and ownership
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, result.projectId));

  if (!project) {
    return { allowed: false, status: 404, message: "Not found" };
  }

  // Public projects are accessible to any authenticated user
  if (project.visibility === "public") {
    return { allowed: true, row: result.attachment };
  }

  // Project owner has access
  if (project.ownerId === user.id) {
    return { allowed: true, row: result.attachment };
  }

  // Check if the user is invited to the project
  if (user.email) {
    const [invite] = await db
      .select()
      .from(projectInvites)
      .where(
        and(
          eq(projectInvites.projectId, project.id),
          eq(projectInvites.email, user.email)
        )
      );
    if (invite) {
      return { allowed: true, row: result.attachment };
    }
  }

  return { allowed: false, status: 403, message: "Forbidden" };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await authorizeAttachmentAccess(request, Number(id));

  if (!authResult.allowed) {
    return new Response(authResult.message, { status: authResult.status });
  }

  const row = authResult.row;

  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.contentType,
      "Content-Disposition": `inline; filename="${row.filename}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await authorizeAttachmentAccess(request, Number(id));

  if (!authResult.allowed) {
    return new Response(authResult.message, { status: authResult.status });
  }

  await db.delete(attachments).where(eq(attachments.id, Number(id)));

  return Response.json({ deleted: true });
}
