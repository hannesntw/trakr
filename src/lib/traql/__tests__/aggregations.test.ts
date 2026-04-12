import { describe, it, expect } from "vitest";
import { query } from "@/test/helpers";

describe("TraQL aggregations", () => {
  it("SELECT count() WHERE type:story — matches actual item count", async () => {
    const countResult = await query("SELECT count() WHERE type:story");
    const itemsResult = await query("type:story");
    expect(countResult.type).toBe("scalar");
    expect(countResult.value).toBe(itemsResult.items!.length);
  });

  it("SELECT sum(points) WHERE sprint:active — matches manual sum", async () => {
    const sumResult = await query("SELECT sum(points) WHERE sprint:active");
    const items = await query("sprint:active");
    const manualSum = items.items!.reduce((s, i) => s + (Number(i.points) || 0), 0);
    expect(sumResult.type).toBe("scalar");
    expect(sumResult.value).toBe(manualSum);
  });

  it("SELECT avg(points) WHERE type:story — matches manual average", async () => {
    const avgResult = await query("SELECT avg(points) WHERE type:story");
    const items = await query("type:story");
    const withPoints = items.items!.filter(i => i.points != null);
    const manualAvg = withPoints.reduce((s, i) => s + Number(i.points), 0) / withPoints.length;
    expect(avgResult.type).toBe("scalar");
    expect(avgResult.value).toBeCloseTo(manualAvg, 1);
  });

  it("SELECT count() GROUP BY state — groups sum to total", async () => {
    const grouped = await query("SELECT count() GROUP BY state");
    const all = await query("type:story OR type:feature OR type:epic OR type:bug OR type:task");
    expect(grouped.type).toBe("grouped");
    expect(grouped.groups!.length).toBeGreaterThan(0);

    // Sum of all groups should equal total items in project
    const groupTotal = grouped.groups!.reduce((s, g) => s + g.value, 0);
    expect(groupTotal).toBe(all.items!.length);

    // Each known state should appear
    const keys = grouped.groups!.map(g => g.key);
    expect(keys).toContain("done");
    expect(keys).toContain("in_progress");
  });

  it("SELECT count() WHERE type:story AND state:done — cross-checked", async () => {
    const result = await query("SELECT count() WHERE type:story AND state:done");
    const items = await query("type:story state:done");
    expect(result.type).toBe("scalar");
    expect(result.value).toBe(items.items!.length);
  });

  it("SELECT sum(points) GROUP BY assignee WHERE sprint:active — all groups have numeric values", async () => {
    const result = await query("SELECT sum(points) GROUP BY assignee WHERE sprint:active");
    expect(result.type).toBe("grouped");
    expect(result.groups!.length).toBeGreaterThan(0);

    // Cross-check: sum of groups should equal total sum
    const totalResult = await query("SELECT sum(points) WHERE sprint:active");
    const groupSum = result.groups!.reduce((s, g) => s + g.value, 0);
    expect(groupSum).toBe(totalResult.value);
  });

  it("SELECT count() GROUP BY project WHERE is:open — cross-project", async () => {
    const result = await query("SELECT count() GROUP BY project WHERE is:open", { projectId: undefined });
    expect(result.type).toBe("grouped");
    expect(result.groups!.length).toBeGreaterThanOrEqual(1);
    const total = result.groups!.reduce((s, g) => s + g.value, 0);
    expect(total).toBeGreaterThan(0);
  });

  it("count() with impossible filter returns zero", async () => {
    const result = await query("SELECT count() WHERE type:epic AND type:story");
    expect(result.type).toBe("scalar");
    expect(result.value).toBe(0);
  });
});
