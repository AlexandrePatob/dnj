const defaultApiUrl = "http://localhost:8080/v1";

export const env = {
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? defaultApiUrl).replace(/\/$/, ""),
  useMocks: false,
  authSimulation: process.env.NEXT_PUBLIC_AUTH_SIMULATION === "true",
  localHomologation: process.env.NEXT_PUBLIC_AUTH_SIMULATION === "true",
} as const;
