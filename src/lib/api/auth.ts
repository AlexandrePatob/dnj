import { apiRequest } from "@/lib/api/client";
import type { VerificationResponse } from "@/lib/api/contracts";

export const authApi = {
  requestCode: (email: string, document: string) =>
    apiRequest<void>("/auth/onboarding", {
      method: "POST",
      body: { email, document },
    }),

  verifyCode: (email: string, verificationCode: string) =>
    apiRequest<VerificationResponse>("/auth/verification-code", {
      method: "POST",
      body: { email, verificationCode },
    }),
};
