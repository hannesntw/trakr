import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { query, assertAllItems, EXPECTED } from "@/test/helpers";

beforeAll(() => {
  vi.useFakeTimers({ now: new Date("2026-04-11T12:00:00Z") });
});

afterAll(() => {
  vi.useRealTimers();
});

describe("TraQL date & time queries", () => {
  it("created:>2026-01-01 returns items created after that date", async () => {
    const r = await query("created:>2026-01-01");
    // SQLite string comparison: "2026-01-01T..." > "2026-01-01" is true
    // So items on or after 2026-01-01 are included
    assertAllItems(r, (i) => {
      const created = String(i.created_at ?? i.createdAt);
      return created >= "2026-01-01";
    });
  });

  it("updated:last(7d) returns recently updated items", async () => {
    const r = await query("updated:last(7d)");
    const cutoff = new Date("2026-04-04T12:00:00Z"); // 7 days before frozen now
    assertAllItems(r, (i) => {
      const updated = new Date(String(i.updated_at ?? i.updatedAt));
      return updated >= cutoff;
    });
  });

  it("updated:last(2w) returns items updated in last 2 weeks", async () => {
    const r = await query("updated:last(2w)");
    const cutoff = new Date("2026-03-28T12:00:00Z"); // 14 days before frozen now
    assertAllItems(r, (i) => {
      const updated = new Date(String(i.updated_at ?? i.updatedAt));
      return updated >= cutoff;
    });
  });

  it("created:2026-01..2026-03 returns items created in Q1", async () => {
    const r = await query("created:2026-01..2026-03");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    assertAllItems(r, (i) => {
      const created = String(i.created_at ?? i.createdAt);
      return created >= "2026-01" && created <= "2026-03\uffff";
    });
  });

  it("created:within(sprint:active) returns items created during active sprint", async () => {
    const r = await query("created:within(sprint:active)");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    // Active ALP sprint: 2026-03-30 to 2026-04-12
    assertAllItems(r, (i) => {
      const created = new Date(String(i.created_at ?? i.createdAt));
      return created >= new Date("2026-03-30") && created <= new Date("2026-04-12T23:59:59Z");
    });
  });
});
