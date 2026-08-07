import { apiRequest } from "@/lib/api/client";
import type { ApiGroup, ApiUser } from "@/lib/api/contracts";

export const groupsApi = {
  search: (search: string, token: string) =>
    apiRequest<ApiGroup[]>(`/groups?search=${encodeURIComponent(search)}`, { token }),

  updateUserGroup: (
    group: { groupId?: string },
    token: string,
  ) =>
    apiRequest<ApiUser>("/users/me/group", {
      method: "POST",
      token,
      body: {
        groupId: group.groupId,
      },
    }),
};
