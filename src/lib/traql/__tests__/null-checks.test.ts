import { describe, it, expect } from "vitest";
import { query, assertAllItems, EXPECTED } from "@/test/helpers";

describe("TraQL null/empty checks", () => {
  it("assignee:empty returns items with null assignee", async () => {
    const r = await query("assignee:empty");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    assertAllItems(r, (i) => i.assignee === null || i.assignee === "");
  });

  it("assignee:!empty returns items with non-null assignee", async () => {
    const r = await query("assignee:!empty");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    assertAllItems(r, (i) => i.assignee !== null && i.assignee !== "");
  });

  it("points:empty returns items with null points", async () => {
    const r = await query("points:empty");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    assertAllItems(r, (i) => i.points === null);
  });

  it("points:!empty returns items with non-null points", async () => {
    const r = await query("points:!empty");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    assertAllItems(r, (i) => i.points !== null);
  });

  it("sprint:empty is an alias for sprint:none", async () => {
    const r = await query("sprint:empty");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    assertAllItems(r, (i) => {
      const sid = i.sprint_id ?? i.sprintId;
      return sid === null || sid === undefined;
    });
  });

  it("sprint:!empty returns items in any sprint", async () => {
    const r = await query("sprint:!empty");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    // The sprint:!empty parser creates operator "not_empty" on the sprint field
    // which maps to IS NOT NULL. But cross-project items (Beta) may also appear.
    // Let's just verify items have a sprint id set.
    assertAllItems(r, (i) => {
      // DB column name varies: sprint_id (raw) or sprintId (drizzle)
      const sid = i.sprint_id ?? i.sprintId ?? i["sprint_id"];
      return sid !== null && sid !== undefined && sid !== 0;
    });
  });
});
