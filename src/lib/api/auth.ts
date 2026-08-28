import { apiMutation, apiRequest } from "./client";
import type { IdentitySessionResponse } from "./contracts";
type EmailSignupResponse = { status: string };
export const authApi = {
  loginWithGoogle: (idToken: string) => apiMutation<IdentitySessionResponse>("/auth/google", { method: "POST", body: { idToken } }),
  getSession: () => apiRequest<IdentitySessionResponse>("/auth/session"),
  refresh: () => apiRequest<IdentitySessionResponse>("/auth/refresh", { method: "POST" }),
  completeOnboarding: (input: { document: string; mobilePhone: string; groupId?: string | null }) => apiMutation<Pick<IdentitySessionResponse, "onboardingRequired" | "user">>("/auth/onboarding", { method: "PATCH", body: input }),
  logout: async () => { await apiMutation<void>("/auth/logout", { method: "POST" }); },
  requestCode: (email: string) => apiMutation<EmailSignupResponse>("/auth/signup", { method: "POST", body: { email } }),
  verifyCode: (email: string, code: string) => apiMutation<IdentitySessionResponse>("/auth/signup/verify", { method: "POST", body: { email, code } }),
};
