// API integration tests for /api/projects/:id/members (story 352)
//
// Limitation: The members endpoint derives membership from project owner,
// invites, and assignees. The seed data sets ownerId to "test-user" but does
// not insert a matching row into the "user" table, so the owner lookup will
// return nothing. The test verifies the endpoint works and returns an array,
// even if empty due to no user rows in the test DB.

import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock auth — next-auth cannot be imported in vitest
vi.mock("@/lib/api-auth", () => ({
  resolveApiUser: vi.fn().mockResolvedValue({ id: "test-user", name: "Test User", email: "test@example.com" }),
}));

vi.mock("@/lib/project-auth", () => ({
  requireProjectAccess: vi.fn().mockResolvedValue({ allowed: true, role: "owner", via: "owner" }),
  resolveProjectAccess: vi.fn().mockResolvedValue({ allowed: true, role: "owner", via: "owner" }),
}));

import { GET } from "../projects/[id]/members/route";

// The test user row ("test-user") is created by the global setup.ts.

describe("GET /api/projects/:id/members", () => {
  it("returns an array of members for the test project", async () => {
    const req = new NextRequest(
      new URL("http://localhost:3100/api/projects/test-project-1/members")
    );
    const res = await GET(req, { params: Promise.resolve({ id: "test-project-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("includes the project owner with id, name, email", async () => {
    const req = new NextRequest(
      new URL("http://localhost:3100/api/projects/test-project-1/members")
    );
    const res = await GET(req, { params: Promise.resolve({ id: "test-project-1" }) });
    const data = await res.json();
    // The owner "test-user" should be present since we inserted a user row
    expect(data.length).toBeGreaterThanOrEqual(1);
    const owner = data.find((m: any) => m.id === "test-user");
    expect(owner).toBeDefined();
    expect(owner).toHaveProperty("id");
    expect(owner).toHaveProperty("name");
    expect(owner).toHaveProperty("email");
  });

  it("returns 404 for non-existent project", async () => {
    const req = new NextRequest(
      new URL("http://localhost:3100/api/projects/99999/members")
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: "99999" }),
    });
    expect(res.status).toBe(404);
  });
});
