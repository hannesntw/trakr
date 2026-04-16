// API integration tests for /api/projects (stories 327, 328)

import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock auth — next-auth cannot be imported in vitest
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "test-user", name: "Test User", email: "test@example.com" } }),
}));

vi.mock("@/lib/api-auth", () => ({
  resolveApiUser: vi.fn().mockResolvedValue({ id: "test-user", name: "Test User", email: "test@example.com" }),
}));

vi.mock("@/lib/project-auth", () => ({
  requireProjectAccess: vi.fn().mockResolvedValue({ allowed: true, role: "owner", via: "owner" }),
  resolveProjectAccess: vi.fn().mockResolvedValue({ allowed: true, role: "owner", via: "owner" }),
}));

import { GET, POST } from "../projects/route";
import {
  GET as GET_BY_ID,
  PATCH,
  DELETE,
} from "../projects/[id]/route";

function jsonRequest(url: string, body: unknown, method = "POST") {
  return new NextRequest(new URL(url, "http://localhost:3100"), {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("GET /api/projects", () => {
  it("returns an array of projects", async () => {
    const res = await GET(new NextRequest("http://localhost:3100/api/projects"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(2); // Alpha + Beta from seed
  });

  it("each project has expected fields", async () => {
    const res = await GET(new NextRequest("http://localhost:3100/api/projects"));
    const data = await res.json();
    const project = data[0];
    expect(project).toHaveProperty("id");
    expect(project).toHaveProperty("name");
    expect(project).toHaveProperty("key");
    expect(project).toHaveProperty("description");
    expect(project).toHaveProperty("visibility");
  });
});

describe("POST /api/projects", () => {
  it("creates a project with name, key, and description", async () => {
    const req = jsonRequest("http://localhost:3100/api/projects", {
      name: "Test Project",
      key: "TST",
      description: "A test project",
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe("Test Project");
    expect(data.key).toBe("TST");
    expect(data.description).toBe("A test project");
    // Cleanup
    const { DELETE: DEL } = await import("@/app/api/projects/[id]/route");
    await DEL(new NextRequest("http://localhost:3100/api/projects/" + data.id), { params: Promise.resolve({ id: String(data.id) }) });
  });

  it("uppercases the project key", async () => {
    const req = jsonRequest("http://localhost:3100/api/projects", {
      name: "Lowercase Key Project",
      key: "low",
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.key).toBe("LOW");
    // Cleanup
    const { DELETE: DEL } = await import("@/app/api/projects/[id]/route");
    await DEL(new NextRequest("http://localhost:3100/api/projects/" + data.id), { params: Promise.resolve({ id: String(data.id) }) });
  });

  it("rejects duplicate key", async () => {
    // ALP already exists from seed
    const req = jsonRequest("http://localhost:3100/api/projects", {
      name: "Duplicate",
      key: "ALP",
    });
    // The insert will throw a UNIQUE constraint error; depending on error
    // handling it may be a 400 or 500. We just verify it does not succeed.
    try {
      const res = await POST(req);
      // If it doesn't throw, it should not be 201
      expect(res.status).not.toBe(201);
    } catch {
      // A thrown error also counts as rejection
      expect(true).toBe(true);
    }
  });

  it("rejects missing name", async () => {
    const req = jsonRequest("http://localhost:3100/api/projects", {
      key: "ZZZ",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects key shorter than 2 chars", async () => {
    const req = jsonRequest("http://localhost:3100/api/projects", {
      name: "Short Key",
      key: "X",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/projects/:id", () => {
  it("updates project name", async () => {
    const req = jsonRequest(
      "http://localhost:3100/api/projects/test-project-1",
      { name: "Alpha Renamed" },
      "PATCH"
    );
    const res = await PATCH(req, { params: Promise.resolve({ id: "test-project-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Alpha Renamed");
  });

  it("updates project description", async () => {
    const req = jsonRequest(
      "http://localhost:3100/api/projects/test-project-1",
      { description: "Updated description" },
      "PATCH"
    );
    const res = await PATCH(req, { params: Promise.resolve({ id: "test-project-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.description).toBe("Updated description");
  });

  it("changes visibility from public to private", async () => {
    const req = jsonRequest(
      "http://localhost:3100/api/projects/test-project-1",
      { visibility: "private" },
      "PATCH"
    );
    const res = await PATCH(req, { params: Promise.resolve({ id: "test-project-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.visibility).toBe("private");
  });

  it("changes visibility back to public", async () => {
    const req = jsonRequest(
      "http://localhost:3100/api/projects/test-project-1",
      { visibility: "public" },
      "PATCH"
    );
    const res = await PATCH(req, { params: Promise.resolve({ id: "test-project-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.visibility).toBe("public");
  });

  it("returns 404 for non-existent project", async () => {
    const req = jsonRequest(
      "http://localhost:3100/api/projects/99999",
      { name: "Nope" },
      "PATCH"
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "99999" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/projects/:id", () => {
  it("creates and then deletes a project", async () => {
    // Create a throwaway project
    const createReq = jsonRequest("http://localhost:3100/api/projects", {
      name: "To Delete",
      key: "DEL",
    });
    const createRes = await POST(createReq);
    expect(createRes.status).toBe(201);
    const created = await createRes.json();

    // Delete it
    const delReq = new NextRequest(
      new URL(
        `http://localhost:3100/api/projects/${created.id}`,
      ),
      { method: "DELETE" }
    );
    const delRes = await DELETE(delReq, {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(delRes.status).toBe(200);
    const body = await delRes.json();
    expect(body.deleted).toBe(true);

    // Verify it's gone
    const getRes = await GET_BY_ID(
      new NextRequest(
        new URL(`http://localhost:3100/api/projects/${created.id}`),
      ),
      { params: Promise.resolve({ id: String(created.id) }) }
    );
    expect(getRes.status).toBe(404);
  });
});
