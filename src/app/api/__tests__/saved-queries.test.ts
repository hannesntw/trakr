import { describe, it, expect, vi, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sql } from "drizzle-orm";

// Mock resolveApiUser to return a test user without needing real auth
vi.mock("@/lib/api-auth", () => ({
  resolveApiUser: vi.fn().mockResolvedValue({
    id: "test-user-sq",
    name: "Test User",
    email: "test@example.com",
  }),
}));

// Import routes AFTER mock is set up
import { GET, POST } from "../saved-queries/route";
import { PATCH, DELETE } from "../saved-queries/[id]/route";

function makeParams(id: number) {
  return { params: Promise.resolve({ id: String(id) }) };
}

describe("Saved queries API", () => {
  let createdId: number;

  beforeAll(async () => {
    // Ensure the test user exists in the user table (needed for the LEFT JOIN in GET)
    // Use Postgres ON CONFLICT syntax (not SQLite INSERT OR IGNORE)
    await db.execute(
      sql`INSERT INTO "user" (id, name, email) VALUES ('test-user-sq', 'Test User SQ', 'test-sq@example.com') ON CONFLICT (id) DO NOTHING`
    );
  });

  it("POST /api/saved-queries creates query", async () => {
    const req = new NextRequest("http://localhost/api/saved-queries", {
      method: "POST",
      body: JSON.stringify({
        projectId: 1,
        name: "My open bugs",
        query: "type = bug AND state != done",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.name).toBe("My open bugs");
    expect(data.query).toBe("type = bug AND state != done");
    expect(data.projectId).toBe(1);
    expect(data.userId).toBe("test-user-sq");

    createdId = data.id;
  });

  it("GET /api/saved-queries?projectId=1 returns queries", async () => {
    const req = new NextRequest("http://localhost/api/saved-queries?projectId=1");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const rows = await res.json();
    expect(rows.length).toBeGreaterThan(0);

    const found = rows.find((r: any) => r.id === createdId);
    expect(found).toBeDefined();
    expect(found.name).toBe("My open bugs");
  });

  it("PATCH starred toggles starred", async () => {
    const req = new NextRequest(`http://localhost/api/saved-queries/${createdId}`, {
      method: "PATCH",
      body: JSON.stringify({ starred: true }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req, makeParams(createdId));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.starred).toBe(true);

    // Toggle back
    const req2 = new NextRequest(`http://localhost/api/saved-queries/${createdId}`, {
      method: "PATCH",
      body: JSON.stringify({ starred: false }),
      headers: { "Content-Type": "application/json" },
    });
    const res2 = await PATCH(req2, makeParams(createdId));
    const data2 = await res2.json();
    expect(data2.starred).toBe(false);
  });

  it("PATCH shared toggles shared", async () => {
    const req = new NextRequest(`http://localhost/api/saved-queries/${createdId}`, {
      method: "PATCH",
      body: JSON.stringify({ shared: true }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req, makeParams(createdId));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.shared).toBe(true);
  });

  it("DELETE removes query", async () => {
    const req = new NextRequest(`http://localhost/api/saved-queries/${createdId}`, {
      method: "DELETE",
    });

    const res = await DELETE(req, makeParams(createdId));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.deleted).toBe(true);

    // Verify it's gone
    const getReq = new NextRequest("http://localhost/api/saved-queries?projectId=1");
    const getRes = await GET(getReq);
    const rows = await getRes.json();
    const found = rows.find((r: any) => r.id === createdId);
    expect(found).toBeUndefined();
  });
});
