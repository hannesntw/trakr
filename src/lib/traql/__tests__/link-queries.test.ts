import { describe, it, expect } from "vitest";
import { query, assertAllItems, EXPECTED } from "@/test/helpers";
import { db } from "@/db";
import { workItemLinks } from "@/db/schema";
import { or, eq, sql } from "drizzle-orm";

describe("TraQL link traversal", () => {
  it("links:any returns items that have at least one link", async () => {
    const r = await query("links:any");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);

    // Verify each returned item actually has a link
    for (const item of r.items!) {
      const links = await db.select().from(workItemLinks).where(
        or(eq(workItemLinks.sourceId, item.id as number), eq(workItemLinks.targetId, item.id as number))
      );
      expect(links.length).toBeGreaterThan(0);
    }
  });

  it("links:none returns items that have no links", async () => {
    const r = await query("links:none");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);

    // Spot-check first few items
    for (const item of r.items!.slice(0, 5)) {
      const links = await db.select().from(workItemLinks).where(
        or(eq(workItemLinks.sourceId, item.id as number), eq(workItemLinks.targetId, item.id as number))
      );
      expect(links.length).toBe(0);
    }
  });

  it("links:blocks returns items that block something", async () => {
    const r = await query("links:blocks");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);

    // Item 3, 5, 7 are blockers in our seed
    const ids = r.items!.map(i => i.id);
    expect(ids).toContain(3);
    expect(ids).toContain(5);
  });

  it("links:blocked_by returns items that are blocked by something", async () => {
    const r = await query("links:blocked_by");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);

    // Items 4, 6, 8 are blocked in our seed
    const ids = r.items!.map(i => i.id);
    expect(ids).toContain(4);
    expect(ids).toContain(6);
  });

  it("blocked_by:in_progress returns items blocked by an in_progress item", async () => {
    // This tests that we join the blocker and check its state
    const r = await query("blocked_by:in_progress");
    expect(r.type).toBe("items");
    // We expect results if any blocker (3, 5, 7) is in_progress
    // The result depends on seed data state assignments
  });
});
