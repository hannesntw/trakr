import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, projectInvites, users, workItems } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const memberMap = new Map<string, { id: string; name: string | null; email: string | null; image: string | null }>();

  // 1. Project owner
  if (project.ownerId) {
    const [owner] = await db
      .select({ id: users.id, name: users.name, email: users.email, image: users.image })
      .from(users)
      .where(eq(users.id, project.ownerId));
    if (owner) {
      memberMap.set(owner.id, owner);
    }
  }

  // 2. Invited users (match projectInvites.email to users.email)
  const invites = await db
    .select({ email: projectInvites.email })
    .from(projectInvites)
    .where(eq(projectInvites.projectId, projectId));

  if (invites.length > 0) {
    const inviteEmails = invites.map((i) => i.email);
    const invitedUsers = await db
      .select({ id: users.id, name: users.name, email: users.email, image: users.image })
      .from(users)
      .where(inArray(users.email, inviteEmails));
    for (const u of invitedUsers) {
      memberMap.set(u.id, u);
    }
  }

  // 3. For public projects: users who have assigned work items
  if (project.visibility === "public") {
    const assigned = await db
      .select({ assignee: workItems.assignee })
      .from(workItems)
      .where(eq(workItems.projectId, projectId));

    const assigneeNames = [...new Set(assigned.map((a) => a.assignee).filter(Boolean))] as string[];

    if (assigneeNames.length > 0) {
      const assignedUsers = await db
        .select({ id: users.id, name: users.name, email: users.email, image: users.image })
        .from(users)
        .where(inArray(users.name, assigneeNames));
      for (const u of assignedUsers) {
        memberMap.set(u.id, u);
      }
    }
  }

  return NextResponse.json([...memberMap.values()]);
}
