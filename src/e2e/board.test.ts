import { test, expect } from "@playwright/test";

// Board pages require authentication. These tests are skipped until a
// test-user session or auth bypass is configured.
//
// TODO: Set up authenticated E2E context. Options:
//   1. Seed a session row + set the "authjs.session-token" cookie via
//      storageState so Playwright is "logged in".
//   2. Add a lightweight test-only credential provider in auth.ts behind
//      an env flag (e.g. AUTH_ALLOW_TEST_LOGIN=1).
//   3. Use page.route() to intercept /api/auth/session and return a
//      fake session payload — works for client components but not for
//      server-side auth() calls that hit the DB directly.

test.describe("Board interactions (auth required)", () => {
  test.skip(true, "Requires authenticated session — see TODO above");

  test("board page loads with columns", async ({ page }) => {
    await page.goto("/projects/TRK/board");

    // Expect at least one column header (workflow states)
    const columns = page.locator('[data-testid="board-column"]');
    await expect(columns.first()).toBeVisible();
    expect(await columns.count()).toBeGreaterThanOrEqual(2);
  });

  test("work item cards are visible on the board", async ({ page }) => {
    await page.goto("/projects/TRK/board");

    const cards = page.locator('[data-testid="work-item-card"]');
    await expect(cards.first()).toBeVisible();
  });

  test("clicking a card opens the detail panel", async ({ page }) => {
    await page.goto("/projects/TRK/board");

    const firstCard = page.locator('[data-testid="work-item-card"]').first();
    await firstCard.click();

    // Detail panel or modal should appear
    const detail = page.locator(
      '[data-testid="work-item-detail"], [role="dialog"]',
    );
    await expect(detail).toBeVisible();
  });
});
