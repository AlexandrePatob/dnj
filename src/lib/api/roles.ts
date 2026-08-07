export const API_USER_ROLES = ["DEFAULT", "EVENT_MANAGER", "ADMIN"] as const;

export type ApiUserRole = typeof API_USER_ROLES[number];
export type DnjActorRole = "participant" | "manager" | "admin";

export function actorRoleFromApiRole(role: ApiUserRole): DnjActorRole {
  if (role === "ADMIN") return "admin";
  if (role === "EVENT_MANAGER") return "manager";
  return "participant";
}

export function isApiUserRole(value: string): value is ApiUserRole {
  return (API_USER_ROLES as readonly string[]).includes(value);
}
