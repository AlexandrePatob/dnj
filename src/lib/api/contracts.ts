import type { ApiUserRole } from "@/lib/api/roles";

export interface ApiGroup {
  id: string;
  groupName: string;
}

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  mobilePhone: string;
  document: string;
  role: ApiUserRole;
  group: ApiGroup | null;
  createdAt: string;
  updatedAt: string;
  points: number;
  rankPosition: number;
}

export interface VerificationResponse extends ApiUser {
  identityToken: string;
}
