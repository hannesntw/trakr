import { describe, it, expect } from "vitest";
import { query, EXPECTED } from "@/test/helpers";
import { tokenize } from "@/lib/traql/lexer";
import { parse } from "@/lib/traql/parser";
import type { GitHubFilterNode } from "@/lib/traql/parser";

// --- Parser tests ---

describe("TraQL GitHub filter parsing", () => {
  it("parses pr:open as a GitHub filter node", () => {
    const ast = parse(tokenize("pr:open"));
    expect(ast.filter).toBeDefined();
    const node = ast.filter as GitHubFilterNode;
    expect(node.kind).toBe("github");
    expect(node.filterType).toBe("pr");
    expect(node.value).toBe("open");
  });

  it("parses pr:merged", () => {
    const ast = parse(tokenize("pr:merged"));
    const node = ast.filter as GitHubFilterNode;
    expect(node.kind).toBe("github");
    expect(node.filterType).toBe("pr");
    expect(node.value).toBe("merged");
  });

  it("parses pr:closed", () => {
    const ast = parse(tokenize("pr:closed"));
    const node = ast.filter as GitHubFilterNode;
    expect(node.kind).toBe("github");
    expect(node.filterType).toBe("pr");
    expect(node.value).toBe("closed");
  });

  it("parses pr:none", () => {
    const ast = parse(tokenize("pr:none"));
    const node = ast.filter as GitHubFilterNode;
    expect(node.kind).toBe("github");
    expect(node.filterType).toBe("pr");
    expect(node.value).toBe("none");
  });

  it("parses ci:passing", () => {
    const ast = parse(tokenize("ci:passing"));
    const node = ast.filter as GitHubFilterNode;
    expect(node.kind).toBe("github");
    expect(node.filterType).toBe("ci");
    expect(node.value).toBe("passing");
  });

  it("parses ci:failing", () => {
    const ast = parse(tokenize("ci:failing"));
    const node = ast.filter as GitHubFilterNode;
    expect(node.kind).toBe("github");
    expect(node.filterType).toBe("ci");
    expect(node.value).toBe("failing");
  });

  it("parses ci:pending", () => {
    const ast = parse(tokenize("ci:pending"));
    const node = ast.filter as GitHubFilterNode;
    expect(node.kind).toBe("github");
    expect(node.filterType).toBe("ci");
    expect(node.value).toBe("pending");
  });

  it("parses ci:none", () => {
    const ast = parse(tokenize("ci:none"));
    const node = ast.filter as GitHubFilterNode;
    expect(node.kind).toBe("github");
    expect(node.filterType).toBe("ci");
    expect(node.value).toBe("none");
  });

  it("parses has:pr", () => {
    const ast = parse(tokenize("has:pr"));
    const node = ast.filter as GitHubFilterNode;
    expect(node.kind).toBe("github");
    expect(node.filterType).toBe("has");
    expect(node.value).toBe("pr");
  });

  it("parses has:branch", () => {
    const ast = parse(tokenize("has:branch"));
    const node = ast.filter as GitHubFilterNode;
    expect(node.kind).toBe("github");
    expect(node.filterType).toBe("has");
    expect(node.value).toBe("branch");
  });

  it("rejects invalid pr: values", () => {
    expect(() => parse(tokenize("pr:invalid"))).toThrow(/Invalid pr: value/);
  });

  it("rejects invalid ci: values", () => {
    expect(() => parse(tokenize("ci:invalid"))).toThrow(/Invalid ci: value/);
  });

  it("rejects invalid has: values", () => {
    expect(() => parse(tokenize("has:invalid"))).toThrow(/Invalid has: value/);
  });

  it("combines GitHub filters with other filters via AND", () => {
    const ast = parse(tokenize("type:story pr:open"));
    expect(ast.filter).toBeDefined();
    expect(ast.filter!.kind).toBe("logic");
  });

  it("combines GitHub filters with OR", () => {
    const ast = parse(tokenize("pr:open OR pr:merged"));
    expect(ast.filter).toBeDefined();
    expect(ast.filter!.kind).toBe("logic");
  });

  it("supports NOT with GitHub filters", () => {
    const ast = parse(tokenize("NOT pr:open"));
    expect(ast.filter).toBeDefined();
    expect(ast.filter!.kind).toBe("not");
  });
});

// --- Executor integration tests ---

describe("TraQL GitHub filter execution", () => {
  it("pr:open returns items with open PRs", async () => {
    const r = await query("pr:open");
    expect(r.type).toBe("items");
    const ids = r.items!.map((i) => i.id);
    expect(ids).toContain(EXPECTED.ITEM_WITH_OPEN_PR);
    expect(ids).not.toContain(EXPECTED.ITEM_WITH_MERGED_PR);
    expect(ids).not.toContain(EXPECTED.ITEM_WITH_CLOSED_PR);
  });

  it("pr:merged returns items with merged PRs", async () => {
    const r = await query("pr:merged");
    expect(r.type).toBe("items");
    const ids = r.items!.map((i) => i.id);
    expect(ids).toContain(EXPECTED.ITEM_WITH_MERGED_PR);
    expect(ids).not.toContain(EXPECTED.ITEM_WITH_OPEN_PR);
  });

  it("pr:closed returns items with closed (not merged) PRs", async () => {
    const r = await query("pr:closed");
    expect(r.type).toBe("items");
    const ids = r.items!.map((i) => i.id);
    expect(ids).toContain(EXPECTED.ITEM_WITH_CLOSED_PR);
    expect(ids).not.toContain(EXPECTED.ITEM_WITH_MERGED_PR);
  });

  it("pr:none returns items without any PR events", async () => {
    const r = await query("pr:none");
    expect(r.type).toBe("items");
    const ids = r.items!.map((i) => i.id);
    // Items 3, 5, 7 have PR events — should NOT be in results
    expect(ids).not.toContain(EXPECTED.ITEM_WITH_OPEN_PR);
    expect(ids).not.toContain(EXPECTED.ITEM_WITH_MERGED_PR);
    expect(ids).not.toContain(EXPECTED.ITEM_WITH_CLOSED_PR);
    // Most items should be in this set
    expect(r.items!.length).toBeGreaterThan(0);
  });

  it("ci:passing returns items with successful CI", async () => {
    const r = await query("ci:passing");
    expect(r.type).toBe("items");
    const ids = r.items!.map((i) => i.id);
    expect(ids).toContain(EXPECTED.ITEM_WITH_PASSING_CI);
    expect(ids).not.toContain(EXPECTED.ITEM_WITH_FAILING_CI);
  });

  it("ci:failing returns items with failed CI", async () => {
    const r = await query("ci:failing");
    expect(r.type).toBe("items");
    const ids = r.items!.map((i) => i.id);
    expect(ids).toContain(EXPECTED.ITEM_WITH_FAILING_CI);
    expect(ids).not.toContain(EXPECTED.ITEM_WITH_PASSING_CI);
  });

  it("ci:pending returns items with pending CI", async () => {
    const r = await query("ci:pending");
    expect(r.type).toBe("items");
    const ids = r.items!.map((i) => i.id);
    expect(ids).toContain(EXPECTED.ITEM_WITH_PENDING_CI);
  });

  it("ci:none returns items without any CI events", async () => {
    const r = await query("ci:none");
    expect(r.type).toBe("items");
    const ids = r.items!.map((i) => i.id);
    expect(ids).not.toContain(EXPECTED.ITEM_WITH_PASSING_CI);
    expect(ids).not.toContain(EXPECTED.ITEM_WITH_FAILING_CI);
    expect(ids).not.toContain(EXPECTED.ITEM_WITH_PENDING_CI);
  });

  it("has:pr returns items that have any PR-related event", async () => {
    const r = await query("has:pr");
    expect(r.type).toBe("items");
    const ids = r.items!.map((i) => i.id);
    expect(ids).toContain(EXPECTED.ITEM_WITH_OPEN_PR);
    expect(ids).toContain(EXPECTED.ITEM_WITH_MERGED_PR);
    expect(ids).toContain(EXPECTED.ITEM_WITH_CLOSED_PR);
    // Item 8 has branch only, no PR number
    expect(ids).not.toContain(EXPECTED.ITEM_WITH_BRANCH_ONLY);
  });

  it("has:branch returns items that have any branch-related event", async () => {
    const r = await query("has:branch");
    expect(r.type).toBe("items");
    const ids = r.items!.map((i) => i.id);
    // Items with branch set: 3, 5, 7, 8, 10 (from PR and push events)
    expect(ids).toContain(EXPECTED.ITEM_WITH_OPEN_PR);      // has branch
    expect(ids).toContain(EXPECTED.ITEM_WITH_BRANCH_ONLY);   // push event with branch
  });

  it("combines pr: with other filters", async () => {
    const r = await query("type:story pr:open");
    expect(r.type).toBe("items");
    // All results should be stories with open PRs
    for (const item of r.items!) {
      expect(item.type).toBe("story");
    }
  });

  it("NOT pr:open excludes items with open PRs", async () => {
    const r = await query("NOT pr:open");
    expect(r.type).toBe("items");
    const ids = r.items!.map((i) => i.id);
    expect(ids).not.toContain(EXPECTED.ITEM_WITH_OPEN_PR);
  });
});
