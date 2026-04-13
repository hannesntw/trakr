// API integration tests for status history (story 315)
//
// Tests that PATCH /api/work-items/:id creates status_history records when
// state changes, and GET /api/work-items/:id/history returns them.

import { describe, it, expect, beforeAll, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock auth modules — next-auth cannot be imported in vitest
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/api-auth", () => ({
  resolveApiUser: vi.fn().mockResolvedValue({ id: "test-user", name: "Test User", email: "test@example.com" }),
}));

import { POST } from "../work-items/route";
import { PATCH } from "../work-items/[id]/route";
import { GET as GET_HISTORY } from "../work-items/[id]/history/route";

let testItemId: number;

function jsonRequest(url: string, body: unknown, method = "POST") {
  return new NextRequest(new URL(url, "http://localhost:3100"), {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeAll(async () => {
  // Create a dedicated work item for status-history tests
  const req = jsonRequest("http://localhost:3100/api/work-items", {
    projectId: 1,
    title: "Status History Test Item",
    type: "story",
    state: "new",
  });
  const res = await POST(req);
  const data = await res.json();
  testItemId = data.id;
});

describe("Status history on state change", () => {
  it("creates a history record when state changes via PATCH", async () => {
    // Change state from "new" to "in_progress"
    const patchReq = jsonRequest(
      `http://localhost:3100/api/work-items/${testItemId}`,
      { state: "in_progress" },
      "PATCH"
    );
    const patchRes = await PATCH(patchReq, {
      params: Promise.resolve({ id: String(testItemId) }),
    });
    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json();
    expect(updated.state).toBe("in_progress");

    // Verify history was recorded
    const histReq = new NextRequest(
      new URL(
        `http://localhost:3100/api/work-items/${testItemId}/history`
      )
    );
    const histRes = await GET_HISTORY(histReq, {
      params: Promise.resolve({ id: String(testItemId) }),
    });
    expect(histRes.status).toBe(200);
    const history = await histRes.json();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(2);
    // First entry is the creation record
    expect(history[0].fromState).toBe("(created)");
    expect(history[0].toState).toBe("new");
    // Second entry is the state change
    expect(history[1].fromState).toBe("new");
    expect(history[1].toState).toBe("in_progress");
  });

  it("history entries have fromState, toState, changedAt", async () => {
    const histReq = new NextRequest(
      new URL(
        `http://localhost:3100/api/work-items/${testItemId}/history`
      )
    );
    const histRes = await GET_HISTORY(histReq, {
      params: Promise.resolve({ id: String(testItemId) }),
    });
    const history = await histRes.json();
    expect(history.length).toBeGreaterThanOrEqual(2);
    const entry = history[1]; // first transition (after creation record)
    expect(entry).toHaveProperty("fromState");
    expect(entry).toHaveProperty("toState");
    expect(entry).toHaveProperty("changedAt");
    expect(typeof entry.changedAt).toBe("string");
  });

  it("records multiple transitions", async () => {
    // Change from "in_progress" to "done"
    const patchReq = jsonRequest(
      `http://localhost:3100/api/work-items/${testItemId}`,
      { state: "done" },
      "PATCH"
    );
    const patchRes = await PATCH(patchReq, {
      params: Promise.resolve({ id: String(testItemId) }),
    });
    expect(patchRes.status).toBe(200);

    // Verify two history entries now
    const histReq = new NextRequest(
      new URL(
        `http://localhost:3100/api/work-items/${testItemId}/history`
      )
    );
    const histRes = await GET_HISTORY(histReq, {
      params: Promise.resolve({ id: String(testItemId) }),
    });
    const history = await histRes.json();
    expect(history.length).toBe(3);
    expect(history[0].fromState).toBe("(created)");
    expect(history[0].toState).toBe("new");
    expect(history[1].fromState).toBe("new");
    expect(history[1].toState).toBe("in_progress");
    expect(history[2].fromState).toBe("in_progress");
    expect(history[2].toState).toBe("done");
  });
});

describe("Non-state changes do not create history", () => {
  it("changing title does not add a history record", async () => {
    // Get current history count
    const histReq1 = new NextRequest(
      new URL(
        `http://localhost:3100/api/work-items/${testItemId}/history`
      )
    );
    const histRes1 = await GET_HISTORY(histReq1, {
      params: Promise.resolve({ id: String(testItemId) }),
    });
    const beforeHistory = await histRes1.json();
    const countBefore = beforeHistory.length;

    // Change only the title (not the state)
    const patchReq = jsonRequest(
      `http://localhost:3100/api/work-items/${testItemId}`,
      { title: "Renamed Item" },
      "PATCH"
    );
    const patchRes = await PATCH(patchReq, {
      params: Promise.resolve({ id: String(testItemId) }),
    });
    expect(patchRes.status).toBe(200);

    // History count should be unchanged
    const histReq2 = new NextRequest(
      new URL(
        `http://localhost:3100/api/work-items/${testItemId}/history`
      )
    );
    const histRes2 = await GET_HISTORY(histReq2, {
      params: Promise.resolve({ id: String(testItemId) }),
    });
    const afterHistory = await histRes2.json();
    expect(afterHistory.length).toBe(countBefore);
  });

  it("changing assignee does not add a history record", async () => {
    const histReq1 = new NextRequest(
      new URL(
        `http://localhost:3100/api/work-items/${testItemId}/history`
      )
    );
    const histRes1 = await GET_HISTORY(histReq1, {
      params: Promise.resolve({ id: String(testItemId) }),
    });
    const beforeHistory = await histRes1.json();
    const countBefore = beforeHistory.length;

    const patchReq = jsonRequest(
      `http://localhost:3100/api/work-items/${testItemId}`,
      { assignee: "Alice" },
      "PATCH"
    );
    const patchRes = await PATCH(patchReq, {
      params: Promise.resolve({ id: String(testItemId) }),
    });
    expect(patchRes.status).toBe(200);

    const histReq2 = new NextRequest(
      new URL(
        `http://localhost:3100/api/work-items/${testItemId}/history`
      )
    );
    const histRes2 = await GET_HISTORY(histReq2, {
      params: Promise.resolve({ id: String(testItemId) }),
    });
    const afterHistory = await histRes2.json();
    expect(afterHistory.length).toBe(countBefore);
  });

  it("setting state to the same value does not add a history record", async () => {
    // Item is currently "done" — PATCH with state:"done" again
    const histReq1 = new NextRequest(
      new URL(
        `http://localhost:3100/api/work-items/${testItemId}/history`
      )
    );
    const histRes1 = await GET_HISTORY(histReq1, {
      params: Promise.resolve({ id: String(testItemId) }),
    });
    const beforeHistory = await histRes1.json();
    const countBefore = beforeHistory.length;

    const patchReq = jsonRequest(
      `http://localhost:3100/api/work-items/${testItemId}`,
      { state: "done" },
      "PATCH"
    );
    const patchRes = await PATCH(patchReq, {
      params: Promise.resolve({ id: String(testItemId) }),
    });
    expect(patchRes.status).toBe(200);

    const histReq2 = new NextRequest(
      new URL(
        `http://localhost:3100/api/work-items/${testItemId}/history`
      )
    );
    const histRes2 = await GET_HISTORY(histReq2, {
      params: Promise.resolve({ id: String(testItemId) }),
    });
    const afterHistory = await histRes2.json();
    expect(afterHistory.length).toBe(countBefore);
  });
});

describe("GET /api/work-items/:id/history", () => {
  it("returns creation record for item with no subsequent state changes", async () => {
    // Create a fresh item
    const createReq = jsonRequest("http://localhost:3100/api/work-items", {
      projectId: 1,
      title: "No History Item",
      type: "task",
    });
    const createRes = await POST(createReq);
    const created = await createRes.json();

    const histReq = new NextRequest(
      new URL(
        `http://localhost:3100/api/work-items/${created.id}/history`
      )
    );
    const histRes = await GET_HISTORY(histReq, {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(histRes.status).toBe(200);
    const history = await histRes.json();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(1);
    expect(history[0].fromState).toBe("(created)");
    expect(history[0].toState).toBe("new");
  });
});
