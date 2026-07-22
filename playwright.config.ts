import { defineConfig, devices } from "@playwright/test";

const deterministicUse = {
  baseURL: "http://127.0.0.1:3000",
  colorScheme: "light" as const,
  locale: "pt-BR",
  reducedMotion: "reduce" as const,
  timezoneId: "America/Sao_Paulo",
};

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    ...deterministicUse,
    trace: "on-first-retry",
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next start",
    gracefulShutdown: {
      signal: "SIGINT",
      timeout: 500,
    },
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      testMatch: ["setup/browser-runner-smoke.spec.ts", "e2e/**/*.spec.ts", "pwa/**/*.spec.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit",
      testMatch: ["setup/browser-runner-smoke.spec.ts", "e2e/**/*.spec.ts"],
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "visual-chromium",
      testMatch: ["visual/**/*.spec.ts"],
      snapshotPathTemplate: "{testDir}/{testFileDir}/__snapshots__/{testFileName}/{arg}-{projectName}-{platform}{ext}",
      use: {
        ...devices["Desktop Chrome"],
        ...deterministicUse,
      },
    },
  ],
});
