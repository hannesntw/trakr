import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { query, queryError, assertAllItems, EXPECTED } from "@/test/helpers";

describe("TraQL edge cases", () => {
  it("empty result — impossible filter combo returns items:[], count:0", async () => {
    // No item can be both type:epic and type:bug simultaneously
    const r = await query("type:epic AND type:bug");
    expect(r.type).toBe("items");
    expect(r.items).toEqual([]);
    expect(r.count).toBe(0);
  });

  it("SQL injection in value — table remains intact", async () => {
    const r = await query("title:~\"'; DROP TABLE work_items; --\"");
    // Should return empty results (no titles match this), not crash
    expect(r.type).toBe("items");
    expect(r.items).toBeDefined();

    // Verify the table is still intact by running a normal query
    const check = await query("type:story");
    expect(check.items!.length).toBeGreaterThan(0);
  });

  it("SQL injection in field name via children — throws ExecutionError", async () => {
    const msg = await queryError("children.nonexistent_col:all(x)");
    expect(msg).toContain("Invalid field");
  });

  it("unterminated string — throws error", async () => {
    const msg = await queryError('title:~"hello');
    expect(msg).toContain("Unterminated string");
  });

  it("deeply nested parens — ((((type:story)))) same as type:story", async () => {
    const nested = await query("((((type:story))))");
    const flat = await query("type:story");

    expect(nested.type).toBe("items");
    expect(nested.items!.length).toBe(flat.items!.length);

    const nestedIds = new Set(nested.items!.map((i) => i.id));
    const flatIds = new Set(flat.items!.map((i) => i.id));
    expect(nestedIds).toEqual(flatIds);
  });

  it("MAX_RESULTS limit — count does not exceed 1000", async () => {
    // Query all items in both projects to exceed the limit
    const r = await query("project:all", { projectId: EXPECTED.ALPHA_PROJECT_ID });
    expect(r.items!.length).toBeLessThanOrEqual(1000);
  });
});

describe("TraQL edge cases (fake timers)", () => {
  beforeAll(() => {
    vi.useFakeTimers({ now: new Date("2026-04-11T12:00:00Z") });
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("NOT is:open — equivalent to is:closed", async () => {
    const notOpen = await query("NOT is:open");
    const closed = await query("is:closed");

    expect(notOpen.type).toBe("items");
    expect(closed.type).toBe("items");
    expect(notOpen.items!.length).toBeGreaterThan(0);
    expect(notOpen.items!.length).toBe(closed.items!.length);

    const notOpenIds = new Set(notOpen.items!.map((i) => i.id));
    const closedIds = new Set(closed.items!.map((i) => i.id));
    expect(notOpenIds).toEqual(closedIds);
  });
});
