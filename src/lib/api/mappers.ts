import type { VerificationResponse } from "@/lib/api/contracts";
import type { User } from "@/types/domain";

export function mapApiUser(user: VerificationResponse): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    document: user.document,
    mobilePhone: user.mobilePhone,
    role: user.role,
    group: user.group,
    points: user.points,
    rankPosition: user.rankPosition,
  };
}
