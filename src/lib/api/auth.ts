import { ApiError, apiRequest } from "@/lib/api/client";
import type { VerificationResponse } from "@/lib/api/contracts";
import { env } from "@/lib/env";

export type SimulatedSmsDelivery = {
  channel: "sms";
  verificationCode: string;
  expiresAt: string;
};

async function simulatedAuthRequest<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json() as T & { message?: string };
  if (!response.ok) throw new ApiError(data.message ?? "Não foi possível validar o código.", response.status, data);
  return data;
}

export const authApi = {
  requestCode: async (email: string, document: string): Promise<SimulatedSmsDelivery | null> => {
    if (env.authSimulation) return simulatedAuthRequest<SimulatedSmsDelivery>("/api/v1/auth/sms", { email, document });
    await apiRequest<void>("/auth/onboarding", { method: "POST", body: { email, document } });
    return null;
  },

  verifyCode: (email: string, document: string, verificationCode: string) =>
    env.authSimulation
      ? simulatedAuthRequest<VerificationResponse>("/api/v1/auth/verification-code", { email, document, verificationCode })
      : apiRequest<VerificationResponse>("/auth/verification-code", { method: "POST", body: { email, verificationCode } }),

  register: (data: { name: string; email: string; mobilePhone: string; group: string }) =>
    simulatedAuthRequest<VerificationResponse>("/api/v1/auth/register", data),
};
