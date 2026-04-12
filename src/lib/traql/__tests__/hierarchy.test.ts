import { describe, it, expect } from "vitest";
import { query, assertAllItems, EXPECTED } from "@/test/helpers";
import { db } from "@/db";
import { workItems } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("TraQL hierarchy traversal", () => {
  it("parent.type:epic — every returned item actually has an epic parent", async () => {
    const result = await query("parent.type:epic");
    expect(result.items!.length).toBeGreaterThan(0);

    // Verify each result's parent is actually type=epic
    for (const item of result.items!.slice(0, 20)) {
      expect(item.parentId).not.toBeNull();
      const [parent] = await db.select().from(workItems).where(eq(workItems.id, item.parentId as number));
      expect(parent.type).toBe("epic");
    }
  });

  it("parent.state:in_progress — every returned item's parent is actually in_progress", async () => {
    const result = await query("parent.state:in_progress");
    expect(result.items!.length).toBeGreaterThan(0);

    for (const item of result.items!.slice(0, 20)) {
      const [parent] = await db.select().from(workItems).where(eq(workItems.id, item.parentId as number));
      expect(parent.state).toBe("in_progress");
    }
  });

  it("children.state:all(done) — every returned item's children are ALL done", async () => {
    const result = await query("children.state:all(done)");
    expect(result.items!.length).toBeGreaterThan(0);

    for (const item of result.items!.slice(0, 10)) {
      const children = await db.select().from(workItems).where(eq(workItems.parentId, item.id as number));
      expect(children.length).toBeGreaterThan(0); // must have children
      for (const child of children) {
        expect(child.state).toBe("done");
      }
    }
  });

  it("children.state:any(in_progress) — at least one child is actually in_progress", async () => {
    const result = await query("children.state:any(in_progress)");
    expect(result.items!.length).toBeGreaterThan(0);

    for (const item of result.items!.slice(0, 10)) {
      const children = await db.select().from(workItems).where(eq(workItems.parentId, item.id as number));
      const hasInProgress = children.some(c => c.state === "in_progress");
      expect(hasInProgress).toBe(true);
    }
  });

  it("children.type:has(bug) — at least one child is actually a bug", async () => {
    const result = await query("children.type:has(bug)");
    expect(result.items!.length).toBeGreaterThan(0);

    for (const item of result.items!.slice(0, 10)) {
      const children = await db.select().from(workItems).where(eq(workItems.parentId, item.id as number));
      const hasBug = children.some(c => c.type === "bug");
      expect(hasBug).toBe(true);
    }
  });

  it("children.count:>3 — every returned item actually has more than 3 children", async () => {
    const result = await query("children.count:>3");
    expect(result.items!.length).toBeGreaterThan(0);

    for (const item of result.items!) {
      const children = await db.select().from(workItems).where(eq(workItems.parentId, item.id as number));
      expect(children.length).toBeGreaterThan(3);
    }
  });

  it("descendant.count:>10 — every returned item actually has more than 10 descendants", async () => {
    const result = await query("descendant.count:>10");
    expect(result.items!.length).toBeGreaterThan(0);

    // Count descendants recursively for the first few results
    async function countDescendants(id: number): Promise<number> {
      const children = await db.select().from(workItems).where(eq(workItems.parentId, id));
      let total = children.length;
      for (const child of children) {
        total += await countDescendants(child.id);
      }
      return total;
    }

    for (const item of result.items!.slice(0, 5)) {
      const count = await countDescendants(item.id as number);
      expect(count).toBeGreaterThan(10);
    }
  });

  it("items NOT matching children.state:all(done) should NOT all have done children", async () => {
    const allDone = await query("children.state:all(done)");
    const anyInProgress = await query("children.state:any(in_progress)");
    const allDoneIds = new Set(allDone.items!.map((i) => i.id));
    for (const item of anyInProgress.items!) {
      expect(allDoneIds.has(item.id)).toBe(false);
    }
  });
});
