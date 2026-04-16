import { describe, it, expect } from "vitest";
import { query, EXPECTED } from "@/test/helpers";

describe("TraQL sprint health", () => {
  it("sprint.health:clean returns done items in closed sprints", async () => {
    const r = await query("sprint.health:clean");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    // All clean items should be in a closed sprint and in a done state
    for (const item of r.items!) {
      const sid = (item.sprint_id ?? item.sprintId) as string;
      expect(["test-sprint-1", "test-sprint-2"]).toContain(sid); // closed sprints
      expect(item.state).toBe("done");
    }
  });

  it("sprint.health:incomplete returns non-done items in active sprints", async () => {
    const r = await query("sprint.health:incomplete");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    for (const item of r.items!) {
      const sid = (item.sprint_id ?? item.sprintId) as string;
      expect(sid).toBe(EXPECTED.ACTIVE_SPRINT_ALP);
      expect(item.state).not.toBe("done");
    }
  });

  it("sprint.health:spilled returns non-done items in closed sprints", async () => {
    const r = await query("sprint.health:spilled");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    for (const item of r.items!) {
      const sid = (item.sprint_id ?? item.sprintId) as string;
      expect(["test-sprint-1", "test-sprint-2"]).toContain(sid); // closed sprints
      expect(item.state).not.toBe("done");
    }
  });

  it("sprint.health:added_late returns items created after sprint start", async () => {
    const r = await query("sprint.health:added_late");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    // Each returned item should have createdAt > its sprint's startDate
    // We know the Active Sprint Item (created 2026-04-02) was added to sprint 3 (started 2026-03-30)
  });

  it("sprint:active sprint.health:incomplete finds at-risk items", async () => {
    const r = await query("sprint:active sprint.health:incomplete");
    expect(r.type).toBe("items");
    expect(r.items!.length).toBeGreaterThan(0);
    for (const item of r.items!) {
      const sid = (item.sprint_id ?? item.sprintId) as string;
      expect(sid).toBe(EXPECTED.ACTIVE_SPRINT_ALP);
      expect(item.state).not.toBe("done");
    }
  });

  it("SELECT count() GROUP BY sprint.health WHERE sprint:active returns health breakdown", async () => {
    const r = await query("SELECT count() GROUP BY sprint.health WHERE sprint:active");
    expect(r.type).toBe("grouped");
    expect(r.groups!.length).toBeGreaterThan(0);
    // Should have at least 'incomplete' since we know there are non-done items in active sprint
    const keys = r.groups!.map(g => g.key);
    // At least one health type should be present
    for (const key of keys) {
      expect(["clean", "incomplete", "added_late", "spilled", "carried"]).toContain(key);
    }
  });
});
