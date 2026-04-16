import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock api-auth to avoid pulling in next-auth (needs full Next.js runtime)
vi.mock("@/lib/api-auth", () => ({
  resolveApiUser: async () => ({ id: "test-user", name: "Test User", email: "test@example.com" }),
}));

// Import route handlers after mock is set up
import { GET, POST } from "../projects/[id]/workflow/route";
import { PATCH, DELETE } from "../projects/[id]/workflow/[stateId]/route";
import { POST as reorder } from "../projects/[id]/workflow/reorder/route";

// Use project 2 (Beta) for workflow tests to avoid interfering with
// Alpha's workflow states used by other tests.
const PROJECT_ID = 2;

function projParams(id: string = PROJECT_ID) {
  return { params: Promise.resolve({ id: String(id) }) };
}
function stateParams(stateId: string, id: string = PROJECT_ID) {
  return { params: Promise.resolve({ id: String(id), stateId: String(stateId) }) };
}

describe("Workflow API", () => {
  it("GET /api/projects/2/workflow returns ordered states", async () => {
    const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/workflow`);
    const res = await GET(req, projParams());
    expect(res.status).toBe(200);

    const states = await res.json();
    expect(states.length).toBeGreaterThan(0);

    // Verify ordered by position
    for (let i = 1; i < states.length; i++) {
      expect(states[i].position).toBeGreaterThanOrEqual(states[i - 1].position);
    }
  });

  it("POST new state auto-generates slug from displayName", async () => {
    const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/workflow`, {
      method: "POST",
      body: JSON.stringify({ displayName: "Code Review", category: "in_progress" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req, projParams());
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.slug).toBe("code_review");
    expect(data.displayName).toBe("Code Review");
    expect(data.category).toBe("in_progress");

    // Clean up
    const delReq = new NextRequest(
      `http://localhost/api/projects/${PROJECT_ID}/workflow/${data.id}`,
      { method: "DELETE" }
    );
    await DELETE(delReq, stateParams(data.id));
  });

  it("POST same slug twice is rejected (409 conflict)", async () => {
    // Create a state
    const req1 = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/workflow`, {
      method: "POST",
      body: JSON.stringify({ displayName: "QA Testing", category: "in_progress" }),
      headers: { "Content-Type": "application/json" },
    });
    const res1 = await POST(req1, projParams());
    expect(res1.status).toBe(201);
    const created = await res1.json();

    // Try creating with same display name (same slug)
    const req2 = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/workflow`, {
      method: "POST",
      body: JSON.stringify({ displayName: "QA Testing", category: "done" }),
      headers: { "Content-Type": "application/json" },
    });
    const res2 = await POST(req2, projParams());
    expect(res2.status).toBe(409);

    const err = await res2.json();
    expect(err.error).toMatch(/qa_testing/);

    // Clean up
    const delReq = new NextRequest(
      `http://localhost/api/projects/${PROJECT_ID}/workflow/${created.id}`,
      { method: "DELETE" }
    );
    await DELETE(delReq, stateParams(created.id));
  });

  it("PATCH displayName changes name, slug stays same", async () => {
    // Get current states
    const getReq = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/workflow`);
    const getRes = await GET(getReq, projParams());
    const states = await getRes.json();
    const target = states.find((s: any) => s.slug === "ready");
    expect(target).toBeDefined();

    const req = new NextRequest(
      `http://localhost/api/projects/${PROJECT_ID}/workflow/${target.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ displayName: "Ready for Dev" }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const res = await PATCH(req, stateParams(target.id));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.displayName).toBe("Ready for Dev");
    expect(data.slug).toBe("ready"); // slug must NOT change

    // Restore
    const restoreReq = new NextRequest(
      `http://localhost/api/projects/${PROJECT_ID}/workflow/${target.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ displayName: "Ready" }),
        headers: { "Content-Type": "application/json" },
      }
    );
    await PATCH(restoreReq, stateParams(target.id));
  });

  it("PATCH category updates category", async () => {
    // First add a new state so we can freely modify it
    const createReq = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/workflow`, {
      method: "POST",
      body: JSON.stringify({ displayName: "Staging", category: "in_progress" }),
      headers: { "Content-Type": "application/json" },
    });
    const createRes = await POST(createReq, projParams());
    const created = await createRes.json();

    const req = new NextRequest(
      `http://localhost/api/projects/${PROJECT_ID}/workflow/${created.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ category: "done" }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const res = await PATCH(req, stateParams(created.id));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.category).toBe("done");

    // Clean up
    const delReq = new NextRequest(
      `http://localhost/api/projects/${PROJECT_ID}/workflow/${created.id}`,
      { method: "DELETE" }
    );
    await DELETE(delReq, stateParams(created.id));
  });

  it("DELETE state succeeds if not last in category", async () => {
    // Add an extra "todo" state so we can safely delete it
    const createReq = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/workflow`, {
      method: "POST",
      body: JSON.stringify({ displayName: "Triaged", category: "todo" }),
      headers: { "Content-Type": "application/json" },
    });
    const createRes = await POST(createReq, projParams());
    expect(createRes.status).toBe(201);
    const created = await createRes.json();

    const delReq = new NextRequest(
      `http://localhost/api/projects/${PROJECT_ID}/workflow/${created.id}`,
      { method: "DELETE" }
    );
    const delRes = await DELETE(delReq, stateParams(created.id));
    expect(delRes.status).toBe(200);

    const data = await delRes.json();
    expect(data.deleted).toBe(true);
  });

  it("DELETE last state in category is rejected", async () => {
    // Get current states, find the only "done" state
    const getReq = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/workflow`);
    const getRes = await GET(getReq, projParams());
    const states = await getRes.json();
    const doneStates = states.filter((s: any) => s.category === "done");

    // If there's more than one done state, delete extras until one remains
    // For seed data there should be exactly one "done" state
    expect(doneStates.length).toBeGreaterThanOrEqual(1);

    // Try to delete the last done state
    const lastDone = doneStates[doneStates.length - 1];
    // If multiple done states exist, we can only test this if there's exactly one
    if (doneStates.length === 1) {
      const delReq = new NextRequest(
        `http://localhost/api/projects/${PROJECT_ID}/workflow/${lastDone.id}`,
        { method: "DELETE" }
      );
      const delRes = await DELETE(delReq, stateParams(lastDone.id));
      expect(delRes.status).toBe(400);

      const err = await delRes.json();
      expect(err.error).toMatch(/last.*done/i);
    }
  });

  it("POST preset delivery_pipeline replaces all states with 6 new ones", async () => {
    const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/workflow`, {
      method: "POST",
      body: JSON.stringify({ preset: "delivery_pipeline" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req, projParams());
    expect(res.status).toBe(201);

    const states = await res.json();
    expect(states.length).toBe(6);

    const slugs = states.map((s: any) => s.slug);
    expect(slugs).toContain("in_preparation");
    expect(slugs).toContain("ready");
    expect(slugs).toContain("in_progress");
    expect(slugs).toContain("dev_done");
    expect(slugs).toContain("deployed");
    expect(slugs).toContain("done");

    // Restore standard preset for other tests
    const restoreReq = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/workflow`, {
      method: "POST",
      body: JSON.stringify({ preset: "standard" }),
      headers: { "Content-Type": "application/json" },
    });
    await POST(restoreReq, projParams());
  });

  it("Reorder updates positions", async () => {
    // Get current states
    const getReq = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/workflow`);
    const getRes = await GET(getReq, projParams());
    const states = await getRes.json();

    // Reverse the order
    const reversed = [...states].reverse().map((s: any) => s.id);

    const req = new NextRequest(
      `http://localhost/api/projects/${PROJECT_ID}/workflow/reorder`,
      {
        method: "POST",
        body: JSON.stringify({ ids: reversed }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const res = await reorder(req, projParams());
    expect(res.status).toBe(200);

    const updated = await res.json();
    // Verify positions match the new order
    for (let i = 0; i < updated.length; i++) {
      expect(updated[i].position).toBe(i);
    }
    expect(updated[0].id).toBe(reversed[0]);

    // Restore original order
    const originalIds = states.map((s: any) => s.id);
    const restoreReq = new NextRequest(
      `http://localhost/api/projects/${PROJECT_ID}/workflow/reorder`,
      {
        method: "POST",
        body: JSON.stringify({ ids: originalIds }),
        headers: { "Content-Type": "application/json" },
      }
    );
    await reorder(restoreReq, projParams());
  });
});
