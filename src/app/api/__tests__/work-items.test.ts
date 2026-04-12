import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { statusHistory } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// Mock api-auth to avoid pulling in next-auth (needs full Next.js runtime)
vi.mock("@/lib/api-auth", () => ({
  resolveApiUser: async () => ({ id: "test-user", name: "Test User", email: "test@example.com" }),
}));

// Import route handlers after mock is set up
import { GET, POST } from "@/app/api/work-items/route";
import {
  GET as GET_BY_ID,
  PATCH,
  DELETE,
} from "@/app/api/work-items/[id]/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(
  url: string,
  options?: { method?: string; body?: unknown }
) {
  const init: RequestInit = { method: options?.method ?? "GET" };
  if (options?.body !== undefined) {
    init.method = options.method ?? "POST";
    init.body = JSON.stringify(options.body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new URL(url, "http://localhost"), init);
}

function idParams(id: number | string) {
  return { params: Promise.resolve({ id: String(id) }) };
}

// ---------------------------------------------------------------------------
// 1-7  Work Item CRUD
// ---------------------------------------------------------------------------

describe("Work Item CRUD", () => {
  const createdIds: number[] = [];

  // 1. POST — create every type
  it.each(["story", "epic", "feature", "bug", "task"] as const)(
    "POST creates a %s with all fields",
    async (type) => {
      const req = makeRequest("/api/work-items", {
        body: {
          projectId: 1,
          title: `Test ${type}`,
          type,
          description: `Desc for ${type}`,
          priority: 1,
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.id).toBeTypeOf("number");
      expect(data.projectId).toBe(1);
      expect(data.title).toBe(`Test ${type}`);
      expect(data.type).toBe(type);
      expect(data.description).toBe(`Desc for ${type}`);
      expect(data.state).toBe("new");
      expect(data.createdAt).toBeTruthy();
      expect(data.updatedAt).toBeTruthy();

      createdIds.push(data.id);
    }
  );

  // 2. GET — list items for project 1
  it("GET /api/work-items?projectId=1 returns items", async () => {
    const req = makeRequest("/api/work-items?projectId=1");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    // Every item belongs to project 1
    for (const item of data) {
      expect(item.projectId).toBe(1);
    }
  });

  // 3. GET — filter by type
  it("GET ?projectId=1&type=story returns only stories", async () => {
    const req = makeRequest("/api/work-items?projectId=1&type=story");
    const res = await GET(req);
    const data = await res.json();
    expect(data.length).toBeGreaterThan(0);
    for (const item of data) {
      expect(item.type).toBe("story");
    }
  });

  // 4. GET — filter by state
  it("GET ?projectId=1&state=done returns only done items", async () => {
    const req = makeRequest("/api/work-items?projectId=1&state=done");
    const res = await GET(req);
    const data = await res.json();
    expect(data.length).toBeGreaterThan(0);
    for (const item of data) {
      expect(item.state).toBe("done");
    }
  });

  // 5. PATCH — update title, state, assignee, points
  it("PATCH updates title, state, assignee, and points", async () => {
    const targetId = createdIds[0]; // the story we created earlier
    const req = makeRequest(`/api/work-items/${targetId}`, {
      method: "PATCH",
      body: {
        title: "Updated title",
        state: "in_progress",
        assignee: "Alice",
        points: 5,
      },
    });

    const res = await PATCH(req, idParams(targetId));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.title).toBe("Updated title");
    expect(data.state).toBe("in_progress");
    expect(data.assignee).toBe("Alice");
    expect(data.points).toBe(5);
  });

  // 6. PATCH state change creates status_history record
  it("PATCH state change creates a status_history record", async () => {
    const targetId = createdIds[0];

    // Move from in_progress (set in test 5) to done
    const req = makeRequest(`/api/work-items/${targetId}`, {
      method: "PATCH",
      body: { state: "done" },
    });
    const res = await PATCH(req, idParams(targetId));
    expect(res.status).toBe(200);

    // Query status_history directly
    const rows = await db
      .select()
      .from(statusHistory)
      .where(eq(statusHistory.workItemId, targetId))
      .orderBy(desc(statusHistory.id));

    expect(rows.length).toBeGreaterThanOrEqual(1);
    const latest = rows[0];
    expect(latest.fromState).toBe("in_progress");
    expect(latest.toState).toBe("done");
  });

  // 7. DELETE — verify deletion
  it("DELETE removes the work item", async () => {
    const targetId = createdIds[createdIds.length - 1]; // last created (task)
    const req = makeRequest(`/api/work-items/${targetId}`, {
      method: "DELETE",
    });
    const res = await DELETE(req, idParams(targetId));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.deleted).toBe(true);

    // Verify it's gone
    const getReq = makeRequest(`/api/work-items/${targetId}`);
    const getRes = await GET_BY_ID(getReq, idParams(targetId));
    expect(getRes.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// 8-10  Points validation (Fibonacci)
// ---------------------------------------------------------------------------

describe("Points validation", () => {
  let itemId: number;

  // Create a fresh item for points tests
  it("setup: create item for points tests", async () => {
    const req = makeRequest("/api/work-items", {
      body: {
        projectId: 2,
        title: "Points validation item",
        type: "story",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    itemId = data.id;
  });

  // 8. Valid Fibonacci number accepted
  it("PATCH points=5 succeeds (Fibonacci)", async () => {
    const req = makeRequest(`/api/work-items/${itemId}`, {
      method: "PATCH",
      body: { points: 5 },
    });
    const res = await PATCH(req, idParams(itemId));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.points).toBe(5);
  });

  // 9. Non-Fibonacci number rejected
  it("PATCH points=7 is rejected (not Fibonacci)", async () => {
    const req = makeRequest(`/api/work-items/${itemId}`, {
      method: "PATCH",
      body: { points: 7 },
    });
    const res = await PATCH(req, idParams(itemId));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(data.error.points).toBeDefined();
  });

  // 10. Null clears points
  it("PATCH points=null clears points", async () => {
    const req = makeRequest(`/api/work-items/${itemId}`, {
      method: "PATCH",
      body: { points: null },
    });
    const res = await PATCH(req, idParams(itemId));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.points).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 11-13  Parent/child relationships
// ---------------------------------------------------------------------------

describe("Parent/child relationships", () => {
  let parentId: number;
  let childId: number;
  let altParentId: number;

  // Create parent and alternate parent
  it("setup: create parent items", async () => {
    const parentReq = makeRequest("/api/work-items", {
      body: {
        projectId: 1,
        title: "Parent feature",
        type: "feature",
      },
    });
    const parentRes = await POST(parentReq);
    expect(parentRes.status).toBe(201);
    parentId = (await parentRes.json()).id;

    const altReq = makeRequest("/api/work-items", {
      body: {
        projectId: 1,
        title: "Alt parent feature",
        type: "feature",
      },
    });
    const altRes = await POST(altReq);
    expect(altRes.status).toBe(201);
    altParentId = (await altRes.json()).id;
  });

  // 11. Create story with parentId
  it("POST with parentId sets parent", async () => {
    const req = makeRequest("/api/work-items", {
      body: {
        projectId: 1,
        title: "Child story",
        type: "story",
        parentId,
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.parentId).toBe(parentId);
    childId = data.id;

    // Verify via GET single-item endpoint (includes children on parent)
    const getRes = await GET_BY_ID(
      makeRequest(`/api/work-items/${parentId}`),
      idParams(parentId)
    );
    const parent = await getRes.json();
    expect(parent.children.some((c: any) => c.id === childId)).toBe(true);
  });

  // 12. PATCH parentId to reparent
  it("PATCH parentId reparents the item", async () => {
    const req = makeRequest(`/api/work-items/${childId}`, {
      method: "PATCH",
      body: { parentId: altParentId },
    });
    const res = await PATCH(req, idParams(childId));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.parentId).toBe(altParentId);

    // Verify child appears under new parent
    const getRes = await GET_BY_ID(
      makeRequest(`/api/work-items/${altParentId}`),
      idParams(altParentId)
    );
    const newParent = await getRes.json();
    expect(newParent.children.some((c: any) => c.id === childId)).toBe(true);

    // Verify child no longer under old parent
    const oldRes = await GET_BY_ID(
      makeRequest(`/api/work-items/${parentId}`),
      idParams(parentId)
    );
    const oldParent = await oldRes.json();
    expect(oldParent.children.some((c: any) => c.id === childId)).toBe(false);
  });

  // 13. PATCH parentId to null — unparent
  it("PATCH parentId=null unparents the item", async () => {
    const req = makeRequest(`/api/work-items/${childId}`, {
      method: "PATCH",
      body: { parentId: null },
    });
    const res = await PATCH(req, idParams(childId));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.parentId).toBeNull();

    // Verify no longer a child of alt parent
    const getRes = await GET_BY_ID(
      makeRequest(`/api/work-items/${altParentId}`),
      idParams(altParentId)
    );
    const altParent = await getRes.json();
    expect(altParent.children.some((c: any) => c.id === childId)).toBe(false);
  });
});
