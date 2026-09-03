import type { ApiUserRole } from "@/lib/api/roles";

export type Screen =
  | "login"
  | "register"
  | "verify"
  | "group"
  | "home"
  | "game"
  | "queue"
  | "account";

export type MainScreen = Extract<Screen, "home" | "game" | "queue" | "account">;
export type Theme = "light" | "dark";

export interface Group {
  id: string;
  groupName: string;
}

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  email: string;
  document: string;
  mobilePhone?: string;
  role?: ApiUserRole;
  group: Group | null;
  points: number;
  rankPosition: number;
}

export interface AuthSession {
  identityToken: string;
  user: User;
}
