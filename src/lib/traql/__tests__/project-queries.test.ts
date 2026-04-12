import { describe, it, expect } from "vitest";
import { query, assertAllItems, EXPECTED } from "@/test/helpers";

describe("TraQL project queries", () => {
  it("project:ALP scopes to Alpha project", async () => {
    const r = await query("project:ALP", { projectId: undefined });
    assertAllItems(r, (i) => i.project_id === EXPECTED.ALPHA_PROJECT_ID || i.projectId === EXPECTED.ALPHA_PROJECT_ID);
  });

  it("project:ALP|BET returns items from both projects", async () => {
    const r = await query("project:ALP|BET", { projectId: undefined });
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    const projectIds = new Set(r.items!.map((i) => i.project_id ?? i.projectId));
    expect(projectIds.has(EXPECTED.ALPHA_PROJECT_ID)).toBe(true);
    expect(projectIds.has(EXPECTED.BETA_PROJECT_ID)).toBe(true);
    assertAllItems(r, (i) => {
      const pid = (i.project_id ?? i.projectId) as number;
      return pid === EXPECTED.ALPHA_PROJECT_ID || pid === EXPECTED.BETA_PROJECT_ID;
    });
  });

  it("project:all returns items from all projects", async () => {
    const r = await query("project:all", { projectId: undefined });
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    const projectIds = new Set(r.items!.map((i) => i.project_id ?? i.projectId));
    expect(projectIds.size).toBeGreaterThanOrEqual(2);
  });

  it("project:ALP type:story is:open combines project scope with filters", async () => {
    const r = await query("project:ALP type:story is:open", { projectId: undefined });
    assertAllItems(r, (i) => {
      const pid = (i.project_id ?? i.projectId) as number;
      return pid === EXPECTED.ALPHA_PROJECT_ID && i.type === "story" && i.state !== "done";
    });
  });
});
