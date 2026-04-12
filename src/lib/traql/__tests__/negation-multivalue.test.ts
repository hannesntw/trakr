import { describe, it, expect } from "vitest";
import { query, assertAllItems, EXPECTED } from "@/test/helpers";

describe("TraQL negation & multi-value", () => {
  it("state:!done excludes done items", async () => {
    const r = await query("state:!done");
    assertAllItems(r, (i) => i.state !== "done");
  });

  it("type:story|bug returns stories and bugs only", async () => {
    const r = await query("type:story|bug");
    assertAllItems(r, (i) => i.type === "story" || i.type === "bug");
  });

  it("state:ready|in_progress returns only those two states", async () => {
    const r = await query("state:ready|in_progress");
    assertAllItems(r, (i) => i.state === "ready" || i.state === "in_progress");
  });
});
