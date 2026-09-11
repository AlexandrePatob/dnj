// Public base URL of the external DNJ API, already including the /v2 prefix.
// The browser calls it directly with Authorization: Bearer — there is no Next
// proxy and no cross-origin cookie involved.
const defaultApiUrl = "https://ttwkfudhvvhuhp5yvsoydxggum0ictpg.lambda-url.sa-east-1.on.aws/v2";

export const env = {
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? defaultApiUrl).replace(/\/$/, ""),
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
} as const;
