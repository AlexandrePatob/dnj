import { apiMutation, apiRequest } from "@/lib/api/client";
import type { ApiGroup, ApiUser } from "@/lib/api/contracts";

export const groupsApi = {
  search: (search = "", token?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    return apiRequest<ApiGroup[]>(`/groups${query}`, { token });
  },
  current: (token?: string) => apiRequest<ApiGroup | null>("/users/me/group", { token }),
  members: (token?: string) => apiRequest<ApiUser[]>("/users/me/group/members", { token }),

  updateUserGroup: (
    group: { groupId?: string },
    token?: string,
  ) =>
    apiMutation<ApiUser>("/users/me/group", {
      method: "PATCH",
      token,
      body: { groupId: group.groupId },
      idempotencyKey: undefined,
    }),
};
