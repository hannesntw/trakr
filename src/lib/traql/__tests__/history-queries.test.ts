import { describe, it, expect } from "vitest";
import { query, assertAllItems, EXPECTED } from "@/test/helpers";

describe("TraQL history queries — WAS", () => {
  it("state WAS in_progress returns items that were ever in_progress", async () => {
    const r = await query("state WAS in_progress");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    // Item 3 had a transition to in_progress
    const ids = r.items!.map(i => i.id);
    expect(ids).toContain(EXPECTED.ITEM_WITH_FULL_HISTORY);
  });

  it("state WAS done returns items that were ever done", async () => {
    const r = await query("state WAS done");
    expect(r.type).toBe("items");
    const ids = r.items!.map(i => i.id);
    expect(ids).toContain(EXPECTED.ITEM_WITH_FULL_HISTORY);
  });

  it("state WAS in_progress BEFORE 2026-01-12 returns items in that state before the date", async () => {
    const r = await query("state WAS in_progress BEFORE 2026-01-12");
    expect(r.type).toBe("items");
    // Item 3 transitioned to in_progress on 2026-01-10, which is before 2026-01-12
    const ids = r.items!.map(i => i.id);
    expect(ids).toContain(EXPECTED.ITEM_WITH_FULL_HISTORY);
  });

  it("state WAS in_progress BEFORE 2026-01-09 does not return item 3", async () => {
    const r = await query("state WAS in_progress BEFORE 2026-01-09");
    expect(r.type).toBe("items");
    // Item 3 transitioned to in_progress on 2026-01-10, so before 2026-01-09 should not match
    const ids = r.items!.map(i => i.id);
    expect(ids).not.toContain(EXPECTED.ITEM_WITH_FULL_HISTORY);
  });

  it("assignee WAS Alice returns items that had Alice as assignee", async () => {
    const r = await query("assignee WAS Alice");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    const ids = r.items!.map(i => i.id);
    expect(ids).toContain(EXPECTED.ITEM_WITH_ASSIGNEE_CHANGE);
  });
});

describe("TraQL history queries — CHANGED", () => {
  it("state CHANGED returns items whose state was ever changed", async () => {
    const r = await query("state CHANGED");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    const ids = r.items!.map(i => i.id);
    expect(ids).toContain(EXPECTED.ITEM_WITH_FULL_HISTORY);
  });

  it("state CHANGED FROM ready TO in_progress returns items with that specific transition", async () => {
    const r = await query("state CHANGED FROM ready TO in_progress");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    const ids = r.items!.map(i => i.id);
    expect(ids).toContain(EXPECTED.ITEM_WITH_FULL_HISTORY);
  });

  it("state CHANGED FROM new TO done does not match item 3 (skipped intermediate states)", async () => {
    const r = await query("state CHANGED FROM new TO done");
    expect(r.type).toBe("items");
    // Item 3 went new->ready->in_progress->done, so there's no direct new->done transition
    const ids = r.items!.map(i => i.id);
    expect(ids).not.toContain(EXPECTED.ITEM_WITH_FULL_HISTORY);
  });

  it("state CHANGED DURING sprint:active returns items changed during the active sprint", async () => {
    const r = await query("state CHANGED DURING sprint:active");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    // Item 5 had a state change on 2026-04-02, within active sprint (2026-03-30 to 2026-04-12)
    const ids = r.items!.map(i => i.id);
    expect(ids).toContain(EXPECTED.ITEM_WITH_ACTIVE_CHANGE);
  });

  it("assignee CHANGED returns items whose assignee was changed", async () => {
    const r = await query("assignee CHANGED");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    const ids = r.items!.map(i => i.id);
    expect(ids).toContain(EXPECTED.ITEM_WITH_ASSIGNEE_CHANGE);
  });

  it("assignee CHANGED FROM Alice TO Bob returns items with that specific reassignment", async () => {
    const r = await query("assignee CHANGED FROM Alice TO Bob");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    const ids = r.items!.map(i => i.id);
    expect(ids).toContain(EXPECTED.ITEM_WITH_ASSIGNEE_CHANGE);
  });
});
