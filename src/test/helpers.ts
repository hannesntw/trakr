// Test helpers for TraQL integration tests

import { runTraql, type TraqlResult, ExecutionError } from "@/lib/traql";
import { EXPECTED } from "./seed-traql";
import { expect } from "vitest";

export async function query(
  q: string,
  opts?: { projectId?: number; userId?: string },
): Promise<TraqlResult> {
  return runTraql(
    q,
    opts?.projectId ?? EXPECTED.ALPHA_PROJECT_ID,
    opts?.userId ?? "test-user",
  );
}

export async function queryError(q: string, projectId?: number): Promise<string> {
  try {
    await runTraql(q, projectId ?? EXPECTED.ALPHA_PROJECT_ID, "test-user");
    throw new Error("Expected query to throw");
  } catch (e) {
    if (e instanceof ExecutionError) return e.message;
    throw e;
  }
}

export function assertAllItems(
  result: TraqlResult,
  predicate: (item: Record<string, unknown>) => boolean,
  message?: string,
) {
  expect(result.type).toBe("items");
  expect(result.items!.length).toBeGreaterThan(0);
  for (const item of result.items!) {
    expect(predicate(item), message ?? `Item #${item.id} failed predicate`).toBe(true);
  }
}

export function assertSorted(
  result: TraqlResult,
  field: string,
  direction: "ASC" | "DESC",
) {
  expect(result.type).toBe("items");
  const items = result.items!;
  for (let i = 1; i < items.length; i++) {
    const a = items[i - 1][field];
    const b = items[i][field];
    if (a == null || b == null) continue;
    if (direction === "ASC") {
      expect(a <= b, `Expected ${field}[${i - 1}]=${a} <= ${field}[${i}]=${b}`).toBe(true);
    } else {
      expect(a >= b, `Expected ${field}[${i - 1}]=${a} >= ${field}[${i}]=${b}`).toBe(true);
    }
  }
}

export { EXPECTED };
