import type { ApiUserRole } from "@/lib/api/roles";

export interface ApiGroup {
  id: string;
  groupName: string;
}

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  mobilePhone: string;
  document: string;
  role: ApiUserRole;
  group: ApiGroup | null;
  createdAt: string;
  updatedAt: string;
  points: number;
  rankPosition: number;
}

export interface IdentityUser { id: string; email: string; name: string; avatarUrl?: string | null; mobilePhone: string; documentMasked: string; role: ApiUserRole; group: { id: string; name: string } | null; onboardingComplete: boolean }
export interface IdentitySessionResponse { accessToken: string; tokenType: "Bearer"; expiresIn: number; csrfToken: string; user: IdentityUser; onboardingRequired: boolean }
export interface PageEnvelope<T> { items: T[]; nextCursor?: string | null; hasMore?: boolean }
export interface V2Participation { id: string; status: string; activityId?: string; createdAt: string }
export interface V2GameOverview { points: number; rankPosition: number; activities: unknown[] }
export interface UploadIntent { id: string; uploadUrl: string; method: "PUT"; headers: Record<string, string>; expiresAt: string }

export interface VerificationResponse extends ApiUser {
  identityToken: string;
}
