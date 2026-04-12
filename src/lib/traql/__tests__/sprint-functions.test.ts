import { describe, it, expect } from "vitest";
import { query, assertAllItems, EXPECTED } from "@/test/helpers";

describe("TraQL sprint functions", () => {
  it("sprint:current is an alias for sprint:active", async () => {
    const r = await query("sprint:current");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    assertAllItems(r, (i) => {
      const sid = i.sprint_id ?? i.sprintId;
      return sid === EXPECTED.ACTIVE_SPRINT_ALP;
    });
  });

  it("sprint:open returns items in non-closed sprints (active or planning)", async () => {
    const r = await query("sprint:open");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    assertAllItems(r, (i) => {
      const sid = i.sprint_id ?? i.sprintId;
      // Sprint 3 (active) and Sprint 4 (planning) for Alpha
      return sid === EXPECTED.ACTIVE_SPRINT_ALP || sid === EXPECTED.PLANNING_SPRINT_ALP;
    });
  });

  it("sprint:future returns items in planning sprints", async () => {
    const r = await query("sprint:future");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    assertAllItems(r, (i) => {
      const sid = i.sprint_id ?? i.sprintId;
      return sid === EXPECTED.PLANNING_SPRINT_ALP;
    });
  });

  it("sprint:closed returns items in closed sprints", async () => {
    const r = await query("sprint:closed");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    assertAllItems(r, (i) => {
      const sid = i.sprint_id ?? i.sprintId;
      return sid === EXPECTED.CLOSED_SPRINT_ALP_1 || sid === EXPECTED.CLOSED_SPRINT_ALP_2;
    });
  });

  it("sprint:last returns items in the most recently closed sprint", async () => {
    const r = await query("sprint:last");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    // Sprint 2 has end_date 2026-02-01, Sprint 1 has 2026-01-18 — so sprint 2 is last
    assertAllItems(r, (i) => {
      const sid = i.sprint_id ?? i.sprintId;
      return sid === EXPECTED.CLOSED_SPRINT_ALP_2;
    });
  });
});
