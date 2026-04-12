import { describe, it, expect } from "vitest";
import { query, assertSorted } from "@/test/helpers";

describe("TraQL sorting", () => {
  it("ORDER BY created DESC — newest first", async () => {
    const result = await query("type:story ORDER BY created DESC");
    expect(result.type).toBe("items");
    expect(result.items!.length).toBeGreaterThan(0);
    assertSorted(result, "createdAt", "DESC");
  });

  it("ORDER BY priority DESC — highest priority first", async () => {
    const result = await query("is:open ORDER BY priority DESC");
    expect(result.type).toBe("items");
    expect(result.items!.length).toBeGreaterThan(0);
    assertSorted(result, "priority", "DESC");
  });

  it("ORDER BY priority DESC, title — multi-field sort", async () => {
    const result = await query("is:open ORDER BY priority DESC, title");
    expect(result.type).toBe("items");
    expect(result.items!.length).toBeGreaterThan(0);
    // Primary sort by priority descending should still hold
    assertSorted(result, "priority", "DESC");
  });

  it("ORDER BY created ASC — oldest first (default direction)", async () => {
    const result = await query("type:bug ORDER BY created");
    expect(result.type).toBe("items");
    expect(result.items!.length).toBeGreaterThan(0);
    assertSorted(result, "createdAt", "ASC");
  });
});
