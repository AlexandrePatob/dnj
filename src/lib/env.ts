const defaultV2Upstream = "https://ttwkfudhvvhuhp5yvsoydxggum0ictpg.lambda-url.sa-east-1.on.aws/v2";

export const env = {
  apiBaseUrl: "/api/v2",
  v2UpstreamUrl: (process.env.DNJ_V2_UPSTREAM_URL ?? defaultV2Upstream).replace(/\/$/, ""),
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? "/api/v2").replace(/\/$/, ""),
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
  useMocks: false,
  authSimulation: process.env.NEXT_PUBLIC_AUTH_SIMULATION === "true",
  localHomologation: process.env.NEXT_PUBLIC_AUTH_SIMULATION === "true",
} as const;
