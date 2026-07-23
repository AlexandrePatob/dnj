import { expect, test } from "@playwright/test";

test.describe("PWA browser integration", () => {
  test("exposes Apple metadata while preserving the application shell", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", /apple-icon/);
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
    await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute("content", "black-translucent");
    await expect(page.getByRole("heading", { name: /Bem-vindo/ })).toBeVisible();
  });

  test("continues as a normal web application without Service Worker support", async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: undefined }));
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Bem-vindo/ })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.getByPlaceholder("000.000.000-00").fill("12345678901");
    await page.getByPlaceholder("seu@email.com").fill("jovem@dnj.test");
    await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeEnabled();
  });

  test("announces offline and reconnection states without blocking the shell", async ({ page, context }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: undefined }));
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await context.setOffline(true);
    await expect(page.getByRole("status")).toContainText("Sem conexão");
    await expect(page.getByRole("heading", { name: /Bem-vindo/ })).toBeVisible();
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(page.getByRole("status")).toContainText("Conexão restabelecida");
    await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeEnabled();
  });
});
