import { expect, test } from "@playwright/test";

const identity = {
  user: {
    id: "user-1", email: "participant@example.com", name: "Participante", mobilePhone: "+5511999999999",
    documentMasked: "***.***.***-09", role: "participant", group: { id: "group-1", name: "Grupo" }, onboardingComplete: true,
  },
  onboardingRequired: false,
};

test.describe("V2 participant migration journeys", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("dnj.onboarding.2k26", "1"));
    await page.route("**/api/v1/**", (route) => route.abort());
    await page.route("**/api/v2/auth/session", (route) => route.fulfill({ json: identity }));
    await page.route("**/api/v2/schedule**", (route) => route.fulfill({ json: { items: [] } }));
  });

  test("bootstraps a valid V2 session and renders an empty Game without V1 calls", async ({ page }) => {
    await page.route("**/api/v2/game/overview", (route) => route.fulfill({ json: { individual: [], groups: [], pointEntries: [], current: { groupId: null, rankPosition: 0 } } }));
    await page.route("**/api/v2/activity-runs/current", (route) => route.fulfill({ status: 204 }));
    await page.route("**/api/v2/participations/current", (route) => route.fulfill({ status: 204 }));

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Dia Nacional da Juventude/ })).toBeVisible();
    await page.getByRole("button", { name: "DNJ Game", exact: true }).click();
    await expect(page.getByText("Ainda não há pontos registrados.")).toBeVisible();
  });

  test("opens the QR scanner and keeps gallery on the V2 empty feed", async ({ page }) => {
    await page.route("**/api/v2/game/overview", (route) => route.fulfill({ json: { individual: [], groups: [], pointEntries: [], current: { groupId: null, rankPosition: 0 } } }));
    await page.route("**/api/v2/activity-runs/current", (route) => route.fulfill({ status: 204 }));
    await page.route("**/api/v2/participations/current", (route) => route.fulfill({ status: 204 }));
    await page.route("**/api/v2/moments?scope=feed", (route) => route.fulfill({ json: { items: [], nextCursor: "opaque-next" } }));
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "DNJ Game", exact: true }).click();
    await page.getByRole("button", { name: "Escanear agora" }).click();
    await expect(page.getByRole("heading", { name: "Escanear QR Code" })).toBeVisible();
    await page.getByRole("button", { name: "Fechar scanner" }).click();
    await page.getByRole("button", { name: "Momentos", exact: true }).click();
    await expect(page.getByText("Ainda não há momentos")).toBeVisible();
  });
});
