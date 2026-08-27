import { apiMutation, apiRequest, ApiError } from "./client";
import type { IdentitySessionResponse, VerificationResponse } from "./contracts";
export const authApi = {
  loginWithGoogle: (idToken: string) => apiMutation<IdentitySessionResponse>("/auth/google", { method: "POST", body: { idToken } }),
  getSession: () => apiRequest<IdentitySessionResponse>("/auth/session"),
  refresh: () => apiRequest<IdentitySessionResponse>("/auth/refresh", { method: "POST" }),
  completeOnboarding: (input: { document: string; mobilePhone: string; groupId?: string | null }) => apiMutation<Pick<IdentitySessionResponse, "onboardingRequired" | "user">>("/auth/onboarding", { method: "PATCH", body: input }),
  logout: async () => { await apiMutation<void>("/auth/logout", { method: "POST" }); },
  requestCode: (email: string) => apiMutation<void>("/auth/signup", { method: "POST", body: { email } }),
  verifyCode: (email: string, code: string) => apiMutation<IdentitySessionResponse>("/auth/signup/verify", { method: "POST", body: { email, code } }),
  register: async (_data: { name: string; email: string; mobilePhone: string; group: string }): Promise<VerificationResponse> => { throw new ApiError("Cadastro legado não está disponível na V2.", 410, undefined, "LEGACY_AUTH"); },
};
