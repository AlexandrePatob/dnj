import { apiMutation, apiRequest, ApiError } from "./client";
import type { IdentitySessionResponse, VerificationResponse } from "./contracts";
type LegacyDelivery = { channel: "sms"; verificationCode: string; expiresAt: string };

export const authApi = {
  loginWithGoogle: (idToken: string) => apiMutation<IdentitySessionResponse>("/auth/google", { method: "POST", body: { idToken } }),
  getSession: () => apiRequest<IdentitySessionResponse>("/auth/session"),
  refresh: () => apiRequest<IdentitySessionResponse>("/auth/refresh", { method: "POST" }),
  completeOnboarding: (input: Record<string, unknown>) => apiMutation<IdentitySessionResponse>("/auth/onboarding", { method: "POST", body: input }),
  logout: async () => { await apiMutation<void>("/auth/logout", { method: "POST" }); },
  requestCode: async (_email: string, _document: string): Promise<LegacyDelivery | null> => { throw new ApiError("Login por código foi substituído pelo Google.", 410, undefined, "LEGACY_AUTH"); },
  verifyCode: async (_email: string, _document: string, _code: string): Promise<VerificationResponse> => { throw new ApiError("Login por código foi substituído pelo Google.", 410, undefined, "LEGACY_AUTH"); },
  register: async (_data: { name: string; email: string; mobilePhone: string; group: string }): Promise<VerificationResponse> => { throw new ApiError("Cadastro legado não está disponível na V2.", 410, undefined, "LEGACY_AUTH"); },
};
