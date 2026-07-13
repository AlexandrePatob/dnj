const defaultApiUrl = "http://localhost:8080/v1";

export const env = {
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? defaultApiUrl).replace(/\/$/, ""),
  useMocks: process.env.NEXT_PUBLIC_USE_MOCKS !== "false",
} as const;
