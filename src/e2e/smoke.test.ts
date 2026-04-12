import { test, expect } from "@playwright/test";

test.describe("Smoke tests (no auth required)", () => {
  test("login page renders with Trakr heading and sign-in form", async ({
    page,
  }) => {
    await page.goto("/login");

    // Heading
    await expect(page.locator("h1")).toContainText("Trakr");

    // Email input and send-link button
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send link/i }),
    ).toBeVisible();

    // Google sign-in button
    await expect(
      page.getByRole("button", { name: /continue with google/i }),
    ).toBeVisible();
  });

  test("/docs/traql loads the TraQL reference page", async ({ page }) => {
    await page.goto("/docs/traql");

    // Page heading
    await expect(
      page.locator("h1", { hasText: "TraQL Language Reference" }),
    ).toBeVisible();

    // At least some collapsible sections are present
    const sections = page.getByRole("button").filter({ hasText: /examples/ });
    await expect(sections.first()).toBeVisible();
    expect(await sections.count()).toBeGreaterThanOrEqual(5);

    // Grammar summary block exists
    await expect(page.locator("text=Grammar Summary")).toBeVisible();
  });

  test("unauthenticated root redirects to /login", async ({ page }) => {
    await page.goto("/");

    // The app redirects unauthenticated users to /login
    await page.waitForURL("**/login**");
    await expect(page.locator("h1")).toContainText("Trakr");
  });

  test("API /api/traql returns 401 without auth", async ({ request }) => {
    const res = await request.post("/api/traql", {
      data: { query: "type:story", projectId: 1 },
    });

    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});
