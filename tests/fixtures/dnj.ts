import { expect, type Page } from "@playwright/test";

export type DnjTheme = "light" | "dark";

const mockUser = {
  id: "2026",
  email: "jovem@dnj.test",
  name: "João Paulo",
  mobilePhone: "41999999999",
  documentMasked: "***.***.***-01",
  role: "DEFAULT",
  group: { id: "26", name: "Grupo Chama Viva – Bairro Alto" },
  onboardingComplete: true,
};

const session = {
  accessToken: "visual-test-access",
  refreshToken: "visual-test-refresh",
  tokenType: "Bearer",
  expiresIn: 900,
  refreshExpiresIn: 2592000,
  onboardingRequired: false,
  user: mockUser,
};

// The browser talks to the external API directly (NEXT_PUBLIC_API_URL);
// every V2 route is answered here so the journeys never reach a real backend.
export async function openDnj(page: Page, theme: DnjTheme) {
  let authenticated = false;
  await page.route("**/v2/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.slice(url.pathname.indexOf("/v2/") + 3);
    if (path === "/auth/session") {
      await route.fulfill(authenticated ? { json: { user: mockUser, onboardingRequired: false } } : { status: 401, json: { code: "UNAUTHENTICATED", message: "Autenticação necessária." } });
      return;
    }
    if (path === "/auth/signup") { await route.fulfill({ json: { status: "CODE_SENT" } }); return; }
    if (path === "/auth/signup/verify") { authenticated = true; await route.fulfill({ json: session }); return; }
    if (path === "/auth/refresh") { await route.fulfill({ status: 401, json: { code: "INVALID_REFRESH_TOKEN", message: "Sessão inválida." } }); return; }
    if (path === "/auth/logout") { authenticated = false; await route.fulfill({ json: { status: "logged_out" } }); return; }
    if (path === "/game/overview") { await route.fulfill({ json: { individual: [], groups: [], pointEntries: [], current: { groupId: "26", points: 150, rankPosition: 9 } } }); return; }
    if (path.startsWith("/schedule")) { await route.fulfill({ json: { items: [], generatedAt: "2026-07-22T18:00:00.000Z" } }); return; }
    if (path.startsWith("/moments")) { await route.fulfill({ json: { items: [], nextCursor: null } }); return; }
    if (path === "/activity-runs/current" || path === "/participations/current") { await route.fulfill({ status: 204 }); return; }
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
  await page.getByPlaceholder("seu@email.com").fill("jovem@dnj.test");
  await page.getByRole("button", { name: "Continuar com e-mail", exact: true }).click();

  const codeInputs = page.locator('input[inputmode="numeric"]');
  await expect(codeInputs).toHaveCount(6);
  // Typing the sixth digit submits the code automatically.
  for (let index = 0; index < 6; index += 1) {
    await codeInputs.nth(index).fill(String(index + 1));
  }

  await expect(page.getByRole("heading", { name: "Olá, João!" })).toBeVisible();
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
