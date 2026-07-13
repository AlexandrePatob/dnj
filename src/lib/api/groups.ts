import { apiRequest } from "@/lib/api/client";
import type { ApiGroup, ApiUser } from "@/lib/api/contracts";

export const groupsApi = {
  search: (search: string, token: string) =>
    apiRequest<ApiGroup[]>(`/groups?search=${encodeURIComponent(search)}`, { token }),

  updateUserGroup: (
    userId: string,
    group: { groupId?: string; groupName?: string },
    token: string,
  ) =>
    apiRequest<ApiUser>(`/users/${userId}/update-group`, {
      method: "POST",
      token,
      body: {
        groupId: group.groupId ? Number(group.groupId) : 0,
        groupName: group.groupName ?? "",
      },
    }),
};
