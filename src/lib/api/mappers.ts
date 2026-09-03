import type { VerificationResponse } from "@/lib/api/contracts";
import type { User } from "@/types/domain";
import type { IdentityUser } from "./contracts";

export function mapApiUser(user: VerificationResponse): User {
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl ?? undefined,
    email: user.email,
    document: user.document,
    mobilePhone: user.mobilePhone,
    role: user.role,
    group: user.group,
    points: user.points,
    rankPosition: user.rankPosition,
  };
}

export function mapIdentityUser(user: IdentityUser): User {
  return { id: user.id, name: user.name, avatarUrl: user.avatarUrl ?? undefined, email: user.email, document: user.documentMasked, mobilePhone: user.mobilePhone, role: user.role, group: user.group ? { id: user.group.id, groupName: user.group.name } : null, points: 0, rankPosition: 0 };
}
