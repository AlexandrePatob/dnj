import { expect, test } from "@playwright/test";

const identity = {
  user: {
    id: "user-1", email: "participant@example.com", name: "Participante", mobilePhone: "+5511999999999",
    documentMasked: "***.***.***-09", role: "participant", group: { id: "group-1", name: "Grupo" }, onboardingComplete: true,
  },
  onboardingRequired: false,
};

test.describe("V2 participant migration journeys", () => {
  test("bootstraps a valid V2 session and renders an empty Game without V1 calls", async ({ page }) => {
    const v1Calls: string[] = [];
    await page.route("**/api/v1/**", async (route) => { v1Calls.push(route.request().url()); await route.abort(); });
    await page.route("**/api/v2/auth/session", async (route) => route.fulfill({ json: identity }));
    await page.route("**/api/v2/game/overview", async (route) => route.fulfill({ json: { points: 0, rankPosition: 0, activities: [] } }));
    await page.route("**/api/v2/activity-runs/current", async (route) => route.fulfill({ status: 204 }));
    await page.route("**/api/v2/participations/current", async (route) => route.fulfill({ status: 204 }));
    await page.addInitScript(() => localStorage.setItem("dnj.onboarding.2k26", "1"));

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Dia Nacional da Juventude/ })).toBeVisible();
    await page.getByRole("button", { name: "DNJ Game", exact: true }).click();
    await expect(page.getByText("Ainda não há pontos registrados.")).toBeVisible();
    expect(v1Calls).toEqual([]);
  });
});
