import { describe, it, expect } from "vitest";
import { query, assertAllItems, EXPECTED } from "@/test/helpers";

describe("TraQL sprint queries", () => {
  it('sprint:"ALP Sprint 3" returns items in that sprint', async () => {
    const r = await query('sprint:"ALP Sprint 3"');
    assertAllItems(r, (i) => {
      const sid = i.sprint_id ?? i.sprintId;
      return sid === EXPECTED.ACTIVE_SPRINT_ALP;
    });
  });

  it("sprint:active returns items in the active sprint", async () => {
    const r = await query("sprint:active");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    assertAllItems(r, (i) => {
      const sid = i.sprint_id ?? i.sprintId;
      return sid === EXPECTED.ACTIVE_SPRINT_ALP;
    });
  });

  it("sprint:none returns items not in any sprint", async () => {
    const r = await query("sprint:none");
    assertAllItems(r, (i) => {
      const sid = i.sprint_id ?? i.sprintId;
      return sid === null || sid === undefined;
    });
  });

  it("sprint.state:closed returns items in closed sprints", async () => {
    const r = await query("sprint.state:closed");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    // Closed sprints for ALP are id 1 and 2
    assertAllItems(r, (i) => {
      const sid = (i.sprint_id ?? i.sprintId) as number;
      return sid === 1 || sid === 2;
    });
  });
});
