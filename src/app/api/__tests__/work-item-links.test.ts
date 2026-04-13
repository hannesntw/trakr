import { describe, it, expect, beforeAll, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock api-auth to avoid pulling in next-auth (needs full Next.js runtime)
vi.mock("@/lib/api-auth", () => ({
  resolveApiUser: async () => ({ id: "test-user", name: "Test User", email: "test@example.com" }),
}));

// Import route handlers after mock is set up
import { GET, POST } from "../work-items/[id]/links/route";
import { DELETE } from "../work-items/[id]/links/[linkId]/route";

// Use two seed work-item IDs from project Alpha (seeded by setup.ts)
const SOURCE_ID = 1;
const TARGET_ID = 2;
const ANOTHER_ID = 3;

function makeParams(id: number) {
  return { params: Promise.resolve({ id: String(id) }) };
}
function makeDeleteParams(id: number, linkId: number) {
  return { params: Promise.resolve({ id: String(id), linkId: String(linkId) }) };
}

describe("Work-item links API", () => {
  let forwardLinkId: number;
  let inverseLinkId: number;

  it("POST link (blocks) creates forward link", async () => {
    const req = new NextRequest("http://localhost/api/work-items/1/links", {
      method: "POST",
      body: JSON.stringify({ targetId: TARGET_ID, type: "blocks" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req, makeParams(SOURCE_ID));
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.link).toBeDefined();
    expect(data.link.sourceId).toBe(SOURCE_ID);
    expect(data.link.targetId).toBe(TARGET_ID);
    expect(data.link.type).toBe("blocks");

    forwardLinkId = data.link.id;
  });

  it("POST link (blocks) auto-creates inverse (blocked_by)", async () => {
    // The previous POST should have returned inverse
    const req = new NextRequest("http://localhost/api/work-items/1/links", {
      method: "POST",
      body: JSON.stringify({ targetId: ANOTHER_ID, type: "blocks" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req, makeParams(SOURCE_ID));
    const data = await res.json();

    expect(data.inverse).toBeDefined();
    expect(data.inverse.sourceId).toBe(ANOTHER_ID);
    expect(data.inverse.targetId).toBe(SOURCE_ID);
    expect(data.inverse.type).toBe("blocked_by");

    inverseLinkId = data.inverse.id;
  });

  it("GET links for source item includes both directions", async () => {
    const req = new NextRequest("http://localhost/api/work-items/1/links");
    const res = await GET(req, makeParams(SOURCE_ID));
    expect(res.status).toBe(200);

    const rows = await res.json();
    // SOURCE_ID has forward links to TARGET_ID and ANOTHER_ID,
    // plus inverse links where SOURCE_ID is the target (blocked_by from TARGET_ID and ANOTHER_ID)
    const asSource = rows.filter((r: any) => r.sourceId === SOURCE_ID);
    const asTarget = rows.filter((r: any) => r.targetId === SOURCE_ID);
    expect(asSource.length).toBeGreaterThan(0);
    expect(asTarget.length).toBeGreaterThan(0);
  });

  it("GET links for target item includes the inverse", async () => {
    const req = new NextRequest("http://localhost/api/work-items/2/links");
    const res = await GET(req, makeParams(TARGET_ID));
    expect(res.status).toBe(200);

    const rows = await res.json();
    // TARGET_ID should have a blocked_by link from SOURCE_ID (as source) with TARGET_ID as target
    const inverse = rows.find(
      (r: any) => r.sourceId === TARGET_ID && r.type === "blocked_by"
    );
    expect(inverse).toBeDefined();
  });

  it("DELETE link removes both forward and inverse", async () => {
    // First create a fresh link to delete
    const createReq = new NextRequest("http://localhost/api/work-items/1/links", {
      method: "POST",
      body: JSON.stringify({ targetId: TARGET_ID, type: "relates_to" }),
      headers: { "Content-Type": "application/json" },
    });
    const createRes = await POST(createReq, makeParams(SOURCE_ID));
    const created = await createRes.json();
    const linkToDelete = created.link.id;

    // Delete via source
    const delReq = new NextRequest(
      `http://localhost/api/work-items/${SOURCE_ID}/links/${linkToDelete}`,
      { method: "DELETE" }
    );
    const delRes = await DELETE(delReq, makeDeleteParams(SOURCE_ID, linkToDelete));
    expect(delRes.status).toBe(200);

    const delData = await delRes.json();
    expect(delData.deleted).toBe(true);

    // Verify both directions are gone
    const getReq = new NextRequest(`http://localhost/api/work-items/${TARGET_ID}/links`);
    const getRes = await GET(getReq, makeParams(TARGET_ID));
    const remaining = await getRes.json();
    const stillThere = remaining.find(
      (r: any) =>
        (r.sourceId === SOURCE_ID && r.targetId === TARGET_ID && r.type === "relates_to") ||
        (r.sourceId === TARGET_ID && r.targetId === SOURCE_ID && r.type === "relates_to")
    );
    expect(stillThere).toBeUndefined();
  });

  it("POST self-link is rejected", async () => {
    const req = new NextRequest("http://localhost/api/work-items/1/links", {
      method: "POST",
      body: JSON.stringify({ targetId: SOURCE_ID, type: "blocks" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req, makeParams(SOURCE_ID));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toMatch(/itself/i);
  });

  it("POST relates_to creates same type in both directions", async () => {
    const req = new NextRequest("http://localhost/api/work-items/1/links", {
      method: "POST",
      body: JSON.stringify({ targetId: ANOTHER_ID, type: "relates_to" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req, makeParams(SOURCE_ID));
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.link.type).toBe("relates_to");
    expect(data.inverse.type).toBe("relates_to");
    expect(data.inverse.sourceId).toBe(ANOTHER_ID);
    expect(data.inverse.targetId).toBe(SOURCE_ID);
  });
});
