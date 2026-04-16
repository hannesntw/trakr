import { db } from "@/db";
import { projects, projectInvites, organizationMembers, teamMembers, teamProjectAccess, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type ProjectAccessRole = "owner" | "admin" | "member" | "viewer";
export type ProjectAccessVia = "owner" | "invite" | "org-admin" | "team" | "public";

export interface ProjectAccess {
  allowed: boolean;
  role: ProjectAccessRole;
  via: ProjectAccessVia;
}

const DENIED: ProjectAccess = { allowed: false, role: "viewer", via: "public" };

/**
 * Check whether a user can access a project and with what role.
 *
 * Access is granted if any of (checked in order):
 * 1. They are the project owner
 * 2. They have a direct project invite
 * 3. They are an org owner or admin of the org the project belongs to
 * 4. They are a member of a team that has access to the project
 * 5. The project is marked visibility: "public" (read-only)
 */
export async function resolveProjectAccess(
  projectId: string,
  userId: string,
): Promise<ProjectAccess> {
  // Fetch the project
  const [project] = await db
    .select({ ownerId: projects.ownerId, orgId: projects.orgId, visibility: projects.visibility })
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) return DENIED;

  // 1. Project owner
  if (project.ownerId === userId) {
    return { allowed: true, role: "owner", via: "owner" };
  }

  // 2. Direct project invite (matches by email)
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
  if (user?.email) {
    const [invite] = await db
      .select({ id: projectInvites.id })
      .from(projectInvites)
      .where(and(eq(projectInvites.projectId, projectId), eq(projectInvites.email, user.email)));
    if (invite) {
      return { allowed: true, role: "member", via: "invite" };
    }
  }

  // 3. Org admin/owner — implicit access to all org projects
  if (project.orgId) {
    const [orgMember] = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(and(eq(organizationMembers.orgId, project.orgId), eq(organizationMembers.userId, userId)));

    if (orgMember) {
      if (orgMember.role === "owner" || orgMember.role === "admin") {
        return { allowed: true, role: "admin", via: "org-admin" };
      }

      // 4. Team with project access — org member must also be in a team that has access
      const teamAccess = await db
        .select({ teamId: teamProjectAccess.teamId })
        .from(teamProjectAccess)
        .innerJoin(teamMembers, eq(teamMembers.teamId, teamProjectAccess.teamId))
        .where(
          and(
            eq(teamProjectAccess.projectId, projectId),
            eq(teamMembers.userId, userId),
          ),
        );

      if (teamAccess.length > 0) {
        return { allowed: true, role: "member", via: "team" };
      }
    }
  }

  // 5. Public visibility (read-only)
  if (project.visibility === "public") {
    return { allowed: true, role: "viewer", via: "public" };
  }

  return DENIED;
}

/**
 * Quick check: does the user have at least the given role on this project?
 */
export async function requireProjectAccess(
  projectId: string,
  userId: string,
  minRole: ProjectAccessRole = "viewer",
): Promise<ProjectAccess | null> {
  const access = await resolveProjectAccess(projectId, userId);
  if (!access.allowed) return null;

  const hierarchy: ProjectAccessRole[] = ["viewer", "member", "admin", "owner"];
  const userLevel = hierarchy.indexOf(access.role);
  const requiredLevel = hierarchy.indexOf(minRole);

  if (userLevel < requiredLevel) return null;
  return access;
}
