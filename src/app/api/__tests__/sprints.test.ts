import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock api-auth to avoid pulling in next-auth (needs full Next.js runtime)
vi.mock("@/lib/api-auth", () => ({
  resolveApiUser: async () => ({ id: "test-user", name: "Test User", email: "test@example.com" }),
}));

// Import route handlers after mock is set up
import { GET as listSprints } from "../sprints/route";
import { GET as getSprint, PATCH as patchSprint } from "../sprints/[id]/route";

function makeParams(id: string) {
  return { params: Promise.resolve({ id: String(id) }) };
}

describe("Sprints API", () => {
  it("GET /api/sprints?projectId=1 returns sprints", async () => {
    const req = new NextRequest("http://localhost/api/sprints?projectId=1");
    const res = await listSprints(req);
    expect(res.status).toBe(200);

    const rows = await res.json();
    expect(rows.length).toBeGreaterThan(0);
    // All results should belong to project 1
    for (const row of rows) {
      expect(row.projectId).toBe(1);
    }
  });

  it("PATCH sprint goal is saved and returned (bug #108 regression)", async () => {
    // Sprint 3 = ALP Sprint 3, currently has goal "Polish"
    const req = new NextRequest("http://localhost/api/sprints/3", {
      method: "PATCH",
      body: JSON.stringify({ goal: "Updated goal for regression test" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await patchSprint(req, makeParams(3));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.goal).toBe("Updated goal for regression test");

    // Re-fetch to confirm it persisted
    const getReq = new NextRequest("http://localhost/api/sprints/3");
    const getRes = await getSprint(getReq, makeParams(3));
    const fetched = await getRes.json();
    expect(fetched.goal).toBe("Updated goal for regression test");

    // Restore original value
    const restoreReq = new NextRequest("http://localhost/api/sprints/3", {
      method: "PATCH",
      body: JSON.stringify({ goal: "Polish" }),
      headers: { "Content-Type": "application/json" },
    });
    await patchSprint(restoreReq, makeParams(3));
  });

  it("PATCH sprint state changes state", async () => {
    // Sprint 4 = ALP Sprint 4, currently "planning"
    const req = new NextRequest("http://localhost/api/sprints/4", {
      method: "PATCH",
      body: JSON.stringify({ state: "active" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await patchSprint(req, makeParams(4));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.state).toBe("active");

    // Activating sprint 4 should have closed sprint 3 (same project)
    const getReq = new NextRequest("http://localhost/api/sprints/3");
    const getRes = await getSprint(getReq, makeParams(3));
    const sprint3 = await getRes.json();
    expect(sprint3.state).toBe("closed");

    // Restore sprint 4 back to planning
    const restoreReq = new NextRequest("http://localhost/api/sprints/4", {
      method: "PATCH",
      body: JSON.stringify({ state: "planning" }),
      headers: { "Content-Type": "application/json" },
    });
    await patchSprint(restoreReq, makeParams(4));

    // Restore sprint 3 back to active (was closed by activating sprint 4)
    const restoreSprint3 = new NextRequest("http://localhost/api/sprints/3", {
      method: "PATCH",
      body: JSON.stringify({ state: "active" }),
      headers: { "Content-Type": "application/json" },
    });
    await patchSprint(restoreSprint3, makeParams(3));
  });

  it("Sprint has startDate and endDate", async () => {
    const req = new NextRequest("http://localhost/api/sprints/1");
    const res = await getSprint(req, makeParams(1));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.startDate).toBeDefined();
    expect(data.startDate).toBeTruthy();
    expect(data.endDate).toBeDefined();
    expect(data.endDate).toBeTruthy();
    // Seed data: "2026-01-05" and "2026-01-18"
    expect(data.startDate).toBe("2026-01-05");
    expect(data.endDate).toBe("2026-01-18");
  });
});
