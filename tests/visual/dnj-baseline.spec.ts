import { expect, test, type Page } from "@playwright/test";
import { enterMainExperience, openDnj, openMainScreen, type DnjTheme } from "../fixtures/dnj";

type Baseline = {
  name: string;
  screen: "login" | "home" | "game" | "queue" | "account";
  theme: DnjTheme;
  viewport: { width: number; height: number };
};

const baselines: Baseline[] = [
  { name: "login-light-360x800.png", screen: "login", theme: "light", viewport: { width: 360, height: 800 } },
  { name: "login-light-430x932.png", screen: "login", theme: "light", viewport: { width: 430, height: 932 } },
  { name: "home-light-360x800.png", screen: "home", theme: "light", viewport: { width: 360, height: 800 } },
  { name: "home-dark-430x932.png", screen: "home", theme: "dark", viewport: { width: 430, height: 932 } },
  { name: "game-light-360x800.png", screen: "game", theme: "light", viewport: { width: 360, height: 800 } },
  { name: "queue-light-430x932.png", screen: "queue", theme: "light", viewport: { width: 430, height: 932 } },
  { name: "account-light-360x800.png", screen: "account", theme: "light", viewport: { width: 360, height: 800 } },
  { name: "account-dark-430x932.png", screen: "account", theme: "dark", viewport: { width: 430, height: 932 } },
];

async function expectBaseline(page: Page, baseline: Baseline) {
  await page.setViewportSize(baseline.viewport);
  await openDnj(page, baseline.theme);

  if (baseline.screen !== "login") {
    await enterMainExperience(page);
    await openMainScreen(page, baseline.screen);
  }

  await page.addStyleTag({
    content: ".orbit-one,.orbit-two{transform:rotate(0deg)!important}.mission-core{transform:rotate(4deg)!important}",
  });
  await page.waitForTimeout(1_500);
  await expect(page).toHaveScreenshot(baseline.name, {
    animations: "disabled",
    caret: "hide",
    scale: "css",
  });
}

for (const baseline of baselines) {
  test(`${baseline.screen} ${baseline.theme} at ${baseline.viewport.width}x${baseline.viewport.height}`, async ({ page }) => {
    await expectBaseline(page, baseline);
  });
}
