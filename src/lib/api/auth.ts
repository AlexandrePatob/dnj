import { ApiError, apiMutation, apiRequest } from "./client";
import { authStorage } from "../auth-storage";
import type { CurrentSessionResponse, IdentitySessionResponse } from "./contracts";
type EmailSignupResponse = { status: string; debugCode?: string };
export const authApi = {
  loginWithGoogle: (idToken: string) => apiMutation<IdentitySessionResponse>("/auth/google", { method: "POST", body: { idToken } }),
  getSession: () => apiRequest<CurrentSessionResponse>("/auth/session"),
  // A refused rotation (reuse, expiry, revocation) ends the local session; network failures keep it for a later retry.
  refresh: async () => {
    if (!authStorage.getAccessToken()) throw new ApiError("Sessão não encontrada.", 401);
    try { return await apiRequest<IdentitySessionResponse>("/auth/refresh", { method: "POST", token: "", refreshOnUnauthorized: false }); }
    catch (error) { if (error instanceof ApiError && error.status !== 0 && error.status !== 408) authStorage.clearCredentials(); throw error; }
  },
  completeOnboarding: (input: { document: string; mobilePhone: string; groupId?: string | null }) => apiMutation<Pick<IdentitySessionResponse, "onboardingRequired" | "user">>("/auth/onboarding", { method: "PATCH", body: input }),
  // Local credentials go away first so the user is signed out even when the API is unreachable.
  logout: async () => {
    const accessToken = authStorage.getAccessToken();
    const csrfToken = authStorage.getCsrfToken();
    authStorage.clearCredentials();
    if (!accessToken && !csrfToken) return;
    await apiMutation<void>("/auth/logout", { method: "POST", token: "", refreshOnUnauthorized: false, headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {} }).catch(() => undefined);
  },
  requestCode: (email: string) => apiMutation<EmailSignupResponse>("/auth/signup", { method: "POST", body: { email } }),
  verifyCode: (email: string, code: string) => apiMutation<IdentitySessionResponse>("/auth/signup/verify", { method: "POST", body: { email, code } }),
};
