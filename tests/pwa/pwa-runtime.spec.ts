import { expect, test, type Page } from "@playwright/test";

import { enterMainExperience, openDnj } from "../fixtures/dnj";

async function waitForPwa(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).some((key) => key.startsWith("dnj-pwa-static-")))).toBe(true);
}

test.describe("PWA runtime", () => {
  test("exposes an installable manifest with Android identities", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const manifestPath = await page.locator('link[rel="manifest"]').getAttribute("href");
    const manifest = await page.request.get(manifestPath ?? "/manifest.webmanifest");
    expect(manifest.status()).toBe(200);
    expect(await manifest.json()).toMatchObject({
      name: "DNJ Game 2K26",
      short_name: "DNJ Game",
      start_url: "/",
      scope: "/",
      display: "standalone",
      icons: expect.arrayContaining([
        expect.objectContaining({ src: "/icons/icon-192x192.png", purpose: "any" }),
        expect.objectContaining({ src: "/icons/icon-512x512.png", purpose: "any" }),
        expect.objectContaining({ src: "/icons/icon-maskable-512x512.png", purpose: "maskable" }),
      ]),
    });
  });

  test("registers the worker and warms versioned shell and static caches", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForPwa(page);
    const state = await page.evaluate(async () => ({
      scope: (await navigator.serviceWorker.ready).scope,
      keys: await caches.keys(),
    }));
    expect(state.scope).toBe(`${new URL(page.url()).origin}/`);
    expect(state.keys.some((key) => key.startsWith("dnj-pwa-shell-"))).toBe(true);
    expect(state.keys.some((key) => key.startsWith("dnj-pwa-static-"))).toBe(true);
  });

  test("reloads the application shell offline after warmup", async ({ page, context }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForPwa(page);
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Bem-vindo/ })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Sem conexão");
  });

  test("returns an explicit first-access response when the shell cache is absent", async ({ page, context }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForPwa(page);
    await page.evaluate(async () => Promise.all((await caches.keys()).map((key) => caches.delete(key))));
    await context.setOffline(true);
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(503);
    await expect(page.locator("body")).toContainText("Aplicativo indisponível offline antes da primeira carga.");
  });

  test("never stores same-origin API requests in Cache Storage", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForPwa(page);
    await page.evaluate(() => fetch("/v1/private").catch(() => undefined));
    const cachedUrls = await page.evaluate(async () => {
      const urls: string[] = [];
      for (const key of await caches.keys()) {
        urls.push(...(await (await caches.open(key)).keys()).map((request) => request.url));
      }
      return urls;
    });
    expect(cachedUrls.every((url) => !new URL(url).pathname.startsWith("/v1/"))).toBe(true);
  });

  test("persists only the approved public offline snapshot", async ({ page }) => {
    await openDnj(page, "light");
    await enterMainExperience(page);
    await expect.poll(() => page.evaluate(() => localStorage.getItem("dnj.pwa.snapshot.v1"))).not.toBeNull();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("dnj.pwa.snapshot.v1") ?? "null"));
    expect(stored).toMatchObject({
      schemaVersion: 1,
      lastMainScreen: "home",
      user: { name: "João Paulo", group: expect.any(String), points: 150, rankPosition: 9 },
    });
    expect(JSON.stringify(stored)).not.toMatch(/cpf|email|token|authorization|headers/i);
  });

  test("activates a replacement worker, cleans old DNJ caches, and does not reload automatically", async ({ page }) => {
    await page.addInitScript(() => {
      const count = Number(sessionStorage.getItem("pwa-load-count") ?? "0") + 1;
      sessionStorage.setItem("pwa-load-count", String(count));
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForPwa(page);
    const waiting = await page.evaluate(async () => {
      await caches.open("dnj-pwa-shell-obsolete");
      const replacement = await navigator.serviceWorker.register("/sw.js?revision=replacement", { scope: "/" });
      const worker = replacement.installing ?? replacement.waiting ?? replacement.active;
      if (worker && worker.state !== "installed") {
        await new Promise<void>((resolve) => worker.addEventListener("statechange", () => {
          if (worker.state === "installed") resolve();
        }));
      }
      return { hasWaiting: Boolean(replacement.waiting), loads: Number(sessionStorage.getItem("pwa-load-count")) };
    });
    expect(waiting.hasWaiting).toBe(true);
    expect(waiting.loads).toBe(1);
    await expect.poll(() => page.evaluate(async () => (
      await navigator.serviceWorker.getRegistrations()
    ).some((registration) => Boolean(registration.waiting)))).toBe(true);
    await page.bringToFront();
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page.getByRole("status")).toContainText("Nova versão disponível");
    const reloaded = page.waitForNavigation({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Atualizar agora" }).click();
    await reloaded;
    expect(await page.evaluate(async () => (await caches.keys()).includes("dnj-pwa-shell-obsolete"))).toBe(false);
    await expect.poll(() => page.evaluate(() => Number(sessionStorage.getItem("pwa-load-count")))).toBe(2);
  });
});
