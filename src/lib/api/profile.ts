import { apiMutation, apiRequest, newIdempotencyKey } from "@/lib/api/client";
import type { IdentityUser } from "@/lib/api/contracts";

export type ProfileUpdate = Partial<Pick<IdentityUser, "name" | "mobilePhone">>;

export const profileApi = {
  current: (token?: string) => apiRequest<IdentityUser>("/users/me", { token }),
  update: (profile: ProfileUpdate, token?: string, idempotencyKey = newIdempotencyKey()) =>
    apiMutation<IdentityUser>("/users/me", { method: "PATCH", body: profile, token, idempotencyKey }),
};
