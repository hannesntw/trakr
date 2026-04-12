import { describe, it, expect } from "vitest";
import { query, EXPECTED } from "@/test/helpers";

async function medianTime(q: string, runs = 3): Promise<number> {
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    await query(q);
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return times[Math.floor(times.length / 2)];
}

describe("TraQL performance", () => {
  it("type:story — < 200ms", async () => {
    const ms = await medianTime("type:story");
    expect(ms).toBeLessThan(200);
  });

  it("parent.type:epic — < 300ms", async () => {
    const ms = await medianTime("parent.type:epic");
    expect(ms).toBeLessThan(300);
  });

  it("children.state:all(done) — < 500ms", async () => {
    const ms = await medianTime("children.state:all(done)");
    expect(ms).toBeLessThan(500);
  });

  it("SELECT count() GROUP BY state — < 300ms", async () => {
    const ms = await medianTime("SELECT count() GROUP BY state");
    expect(ms).toBeLessThan(300);
  });

  it("complex: (type:story OR type:bug) AND state:!done ORDER BY priority DESC — < 300ms", async () => {
    const ms = await medianTime(
      "(type:story OR type:bug) AND state:!done ORDER BY priority DESC",
    );
    expect(ms).toBeLessThan(300);
  });
});
