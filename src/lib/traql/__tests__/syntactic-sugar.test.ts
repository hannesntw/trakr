import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { query, assertAllItems } from "@/test/helpers";

beforeAll(() => {
  vi.useFakeTimers({ now: new Date("2026-04-11T12:00:00Z") });
});

afterAll(() => {
  vi.useRealTimers();
});

describe("TraQL syntactic sugar", () => {
  it("is:open — no done items", async () => {
    const result = await query("is:open");
    assertAllItems(result, (item) => item.state !== "done");
  });

  it("is:closed — all items are done", async () => {
    const result = await query("is:closed");
    assertAllItems(result, (item) => item.state === "done");
  });

  it("is:unassigned — all items have null assignee", async () => {
    const result = await query("is:unassigned");
    assertAllItems(
      result,
      (item) => item.assignee === null || item.assignee === undefined,
    );
  });

  it("is:stale — items not updated recently and not done", async () => {
    const result = await query("is:stale");
    expect(result.type).toBe("items");
    expect(result.items!.length).toBeGreaterThan(0);

    const fourteenDaysAgo = new Date("2026-04-11T12:00:00Z");
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    assertAllItems(result, (item) => {
      const updatedAt = new Date(item.updatedAt as string);
      return updatedAt < fourteenDaysAgo && item.state !== "done";
    });
  });

  it("my:items — returns items assigned to current user", async () => {
    const result = await query("my:items", { userId: "Alice" });
    assertAllItems(result, (item) => item.assignee === "Alice");
  });

  it("is:open and is:closed are mutually exclusive", async () => {
    const open = await query("is:open");
    const closed = await query("is:closed");
    const openIds = new Set(open.items!.map((i) => i.id));
    for (const item of closed.items!) {
      expect(openIds.has(item.id)).toBe(false);
    }
  });
});
