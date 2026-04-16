import { describe, it, expect } from "vitest";
import { query, assertAllItems, EXPECTED } from "@/test/helpers";

describe("TraQL field queries", () => {
  it("type:story returns only stories", async () => {
    const r = await query("type:story");
    assertAllItems(r, (i) => i.type === "story");
  });

  it("state:in_progress returns only in-progress items", async () => {
    const r = await query("state:in_progress");
    assertAllItems(r, (i) => i.state === "in_progress");
  });

  it("assignee:Alice returns only items assigned to Alice", async () => {
    const r = await query("assignee:Alice");
    assertAllItems(r, (i) => i.assignee === "Alice");
  });

  it('title:~"sprint planning" returns items with matching title', async () => {
    const r = await query('title:~"sprint planning"');
    assertAllItems(r, (i) =>
      String(i.title).toLowerCase().includes("sprint planning"),
    );
  });

  it("points:>=5 returns items with 5 or more points", async () => {
    const r = await query("points:>=5");
    assertAllItems(r, (i) => Number(i.points) >= 5);
  });

  it("priority:>2 returns items with priority above 2", async () => {
    const r = await query("priority:>2");
    assertAllItems(r, (i) => Number(i.priority) > 2);
  });

  it("id:test-wi-3 returns the specific item", async () => {
    const r = await query("id:test-wi-3");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBe(1);
    expect(r.items![0].id).toBe("test-wi-3");
  });
});
