import { describe, it, expect } from "vitest";
import { query, assertAllItems } from "@/test/helpers";

describe("TraQL logic and grouping", () => {
  it("implicit AND — type:story state:ready", async () => {
    const result = await query("type:story state:ready");
    assertAllItems(result, (item) => item.type === "story" && item.state === "ready");
  });

  it("explicit AND — type:story AND state:ready", async () => {
    const result = await query("type:story AND state:ready");
    assertAllItems(result, (item) => item.type === "story" && item.state === "ready");
  });

  it("implicit AND and explicit AND return the same results", async () => {
    const implicit = await query("type:story state:ready");
    const explicit = await query("type:story AND state:ready");
    expect(implicit.items!.length).toBe(explicit.items!.length);
  });

  it("OR — type:story OR type:bug", async () => {
    const result = await query("type:story OR type:bug");
    assertAllItems(result, (item) => item.type === "story" || item.type === "bug");
  });

  it("NOT state:done — excludes done items", async () => {
    const result = await query("NOT state:done");
    assertAllItems(result, (item) => item.state !== "done");
  });

  it("grouped — (type:story OR type:bug) AND state:!done", async () => {
    const result = await query("(type:story OR type:bug) AND state:!done");
    assertAllItems(
      result,
      (item) =>
        (item.type === "story" || item.type === "bug") && item.state !== "done",
    );
  });

  it("OR returns more results than either side alone", async () => {
    const stories = await query("type:story");
    const bugs = await query("type:bug");
    const both = await query("type:story OR type:bug");
    expect(both.items!.length).toBe(stories.items!.length + bugs.items!.length);
  });
});
