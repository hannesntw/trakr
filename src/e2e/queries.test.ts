import { test, expect } from "@playwright/test";

// The queries page is behind project auth (same as board).
// See board.test.ts for auth bypass TODO.

test.describe("Queries page (auth required)", () => {
  test.skip(true, "Requires authenticated session — see board.test.ts TODO");

  test("queries page loads with editor and saved queries sidebar", async ({
    page,
  }) => {
    await page.goto("/projects/TRK/queries");

    // Query editor textarea or input
    const editor = page.locator("textarea, [contenteditable]").first();
    await expect(editor).toBeVisible();

    // A "Run" or execute button
    await expect(
      page.getByRole("button", { name: /run/i }),
    ).toBeVisible();
  });

  test("typing a query and clicking Run shows results", async ({ page }) => {
    await page.goto("/projects/TRK/queries");

    const editor = page.locator("textarea").first();
    await editor.fill("type:story");

    const runButton = page.getByRole("button", { name: /run/i });
    await runButton.click();

    // Results area should appear with at least one row or item
    const results = page.locator(
      '[data-testid="query-results"], table, [role="table"]',
    );
    await expect(results).toBeVisible({ timeout: 10_000 });
  });
});
