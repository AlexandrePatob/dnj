import { expect, test } from "@playwright/test";

test("serves the application through the production Next.js server", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator("body")).toBeVisible();
});
