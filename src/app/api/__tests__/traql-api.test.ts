// API integration tests for POST /api/traql (story 349)
//
// Limitation: The traql route calls resolveApiUser() which checks for a
// Bearer token or session. In the test environment there is no active session
// and no API key, so user resolves to null. The route still works — it just
// passes userId=undefined to runTraql, which means user-scoped features
// (like "assigned:me") won't resolve. The core query engine is unaffected.

import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock auth modules — next-auth cannot be imported in vitest
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

import { POST } from "../traql/route";

function traqlRequest(body: unknown) {
  return new NextRequest(new URL("http://localhost:3100/api/traql"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/traql — basic queries", () => {
  it("returns items for a basic query", async () => {
    const res = await POST(traqlRequest({ query: "type:story", projectId: "test-project-1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe("items");
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBeGreaterThan(0);
  });

  it("items have expected fields", async () => {
    const res = await POST(traqlRequest({ query: "type:bug", projectId: "test-project-1" }));
    const data = await res.json();
    expect(data.items.length).toBeGreaterThan(0);
    const item = data.items[0];
    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("title");
    expect(item).toHaveProperty("type");
    expect(item).toHaveProperty("state");
  });
});

describe("POST /api/traql — aggregates", () => {
  it("SELECT count() returns a scalar", async () => {
    const res = await POST(
      traqlRequest({ query: "SELECT count() WHERE type:story", projectId: "test-project-1" })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe("scalar");
    expect(typeof data.value).toBe("number");
    expect(data.value).toBeGreaterThan(0);
  });
});

describe("POST /api/traql — GROUP BY", () => {
  it("SELECT count() GROUP BY state returns grouped results", async () => {
    const res = await POST(
      traqlRequest({
        query: "SELECT count() GROUP BY state",
        projectId: "test-project-1",
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe("grouped");
    expect(Array.isArray(data.groups)).toBe(true);
    expect(data.groups.length).toBeGreaterThan(0);
    // Each group should have key and value
    for (const group of data.groups) {
      expect(group).toHaveProperty("key");
      expect(group).toHaveProperty("value");
      expect(typeof group.value).toBe("number");
    }
  });
});

describe("POST /api/traql — format()", () => {
  it('SELECT format("{title}") returns text lines', async () => {
    const res = await POST(
      traqlRequest({
        query: 'SELECT format("{title}") WHERE type:story',
        projectId: "test-project-1",
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe("text");
    expect(Array.isArray(data.text)).toBe(true);
    expect(data.text.length).toBeGreaterThan(0);
    // Each line should be a non-empty string
    for (const line of data.text) {
      expect(typeof line).toBe("string");
      expect(line.length).toBeGreaterThan(0);
    }
  });
});

describe("POST /api/traql — error handling", () => {
  it("returns 400 for invalid/unparseable query", async () => {
    const res = await POST(
      traqlRequest({ query: "SELECT !!! BROKEN", projectId: "test-project-1" })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  it("returns 400 for empty query string", async () => {
    const res = await POST(traqlRequest({ query: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing query field", async () => {
    const res = await POST(traqlRequest({}));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/traql — projectId scoping", () => {
  it("scopes results to the specified project", async () => {
    const resAlpha = await POST(
      traqlRequest({ query: "type:story", projectId: "test-project-1" })
    );
    const resBeta = await POST(
      traqlRequest({ query: "type:story", projectId: "test-project-2" })
    );
    const alphaData = await resAlpha.json();
    const betaData = await resBeta.json();

    // Both should have items, but they should differ in count
    // (Alpha has ~160 stories, Beta has ~450 — different project sizes)
    expect(alphaData.items.length).toBeGreaterThan(0);
    expect(betaData.items.length).toBeGreaterThan(0);
    expect(alphaData.items.length).not.toBe(betaData.items.length);
  });

  it("items belong to the specified project", async () => {
    const res = await POST(
      traqlRequest({ query: "type:epic", projectId: "test-project-2" })
    );
    const data = await res.json();
    expect(data.items.length).toBeGreaterThan(0);
    for (const item of data.items) {
      expect(item.projectId).toBe("test-project-2");
    }
  });
});
