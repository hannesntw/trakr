import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ssoConfigurations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";

/**
 * Validate SCIM Bearer token and return the orgId it belongs to.
 * Returns null if the token is invalid.
 */
export async function authenticateScimToken(
  request: NextRequest,
): Promise<{ orgId: number } | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const tokenHash = createHash("sha256").update(token).digest("hex");

  // Find any SSO config where the SCIM token hash matches
  const configs = await db.select().from(ssoConfigurations);
  const match = configs.find((c) => c.scimTokenHash === tokenHash);
  if (!match) return null;

  return { orgId: match.orgId };
}

/**
 * Return a SCIM error response in the standard format.
 */
export function scimError(status: number, detail: string): NextResponse {
  return NextResponse.json(
    {
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      status: String(status),
      detail,
    },
    { status },
  );
}

/**
 * Format a SCIM ListResponse.
 */
export function scimListResponse(
  resources: unknown[],
  totalResults: number,
  startIndex: number = 1,
): NextResponse {
  return NextResponse.json({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults,
    itemsPerPage: resources.length,
    startIndex,
    Resources: resources,
  });
}

/**
 * Format a user record as a SCIM User resource.
 */
export function toScimUser(user: {
  id: string;
  email: string | null;
  name: string | null;
  emailVerified: Date | null;
  image: string | null;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}) {
  const nameParts = (user.name ?? "").split(" ");
  const givenName = nameParts[0] || "";
  const familyName = nameParts.slice(1).join(" ") || "";

  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: user.id,
    userName: user.email ?? "",
    name: {
      givenName,
      familyName,
      formatted: user.name ?? "",
    },
    emails: user.email
      ? [{ value: user.email, primary: true, type: "work" }]
      : [],
    active: user.active !== false,
    displayName: user.name ?? user.email ?? "",
    photos: user.image ? [{ value: user.image, type: "photo" }] : [],
    meta: {
      resourceType: "User",
      created: user.createdAt ?? new Date().toISOString(),
      lastModified: user.updatedAt ?? new Date().toISOString(),
    },
  };
}

/**
 * Format a team record as a SCIM Group resource.
 */
export function toScimGroup(team: {
  id: number;
  name: string;
  createdAt: string;
  members?: { userId: string; email?: string | null }[];
}) {
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:Group"],
    id: String(team.id),
    displayName: team.name,
    members: (team.members ?? []).map((m) => ({
      value: m.userId,
      display: m.email ?? m.userId,
    })),
    meta: {
      resourceType: "Group",
      created: team.createdAt,
      lastModified: team.createdAt,
    },
  };
}
