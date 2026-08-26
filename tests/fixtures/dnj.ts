import { expect, type Page } from "@playwright/test";

export type DnjTheme = "light" | "dark";

export async function openDnj(page: Page, theme: DnjTheme) {
  const mockUser = {
    id: "2026",
    email: "jovem@dnj.test",
    name: "João Paulo",
    mobilePhone: "41999999999",
    document: "12345678901",
    role: "DEFAULT",
    group: { id: "26", groupName: "Grupo Chama Viva – Bairro Alto" },
    createdAt: "2026-07-22T15:00:00-03:00",
    updatedAt: "2026-07-22T15:00:00-03:00",
  };

  await page.route("http://localhost:8080/v1/**", async (route) => {
    const url = route.request().url();
    if (url.endsWith("/auth/onboarding")) {
      await route.fulfill({ status: 204 });
      return;
    }
    if (url.endsWith("/auth/verification-code")) {
      await route.fulfill({ json: { ...mockUser, identityToken: "visual-test-token" } });
      return;
    }
    if (url.includes("/update-group")) {
      await route.fulfill({ json: mockUser });
      return;
    }
    await route.fulfill({ json: [] });
  });

  await page.addInitScript((initialTheme) => {
    localStorage.setItem("dnj_theme", initialTheme);
    localStorage.setItem("dnj_qr_seen", "1");
    localStorage.setItem("dnj.onboarding.2k26", "1");
  }, theme);
  await page.clock.setFixedTime(new Date("2026-07-22T15:00:00-03:00"));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
}

export async function enterMainExperience(page: Page) {
  await page.getByPlaceholder("000.000.000-00").fill("12345678901");
  await page.getByPlaceholder("seu@email.com").fill("jovem@dnj.test");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();

  const codeInputs = page.locator('input[inputmode="numeric"]');
  await expect(codeInputs).toHaveCount(6);
  for (let index = 0; index < 6; index += 1) {
    await codeInputs.nth(index).fill(String(index + 1));
  }

  await page.getByRole("button", { name: /Verificar/ }).click();
  await page.getByRole("button", { name: /Confirmar grupo/ }).click();
  await expect(page.getByRole("heading", { name: /Dia Nacional da Juventude/ })).toBeVisible();
}

export async function openMainScreen(page: Page, screen: "home" | "game" | "queue" | "account") {
  if (screen === "home") return;

  const labels = {
    game: "DNJ Game",
    queue: "Fila",
    account: "Conta",
  } as const;
  await page.getByRole("button", { name: labels[screen], exact: true }).click();
}
