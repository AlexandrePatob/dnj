import { apiMutation, apiRequest } from "@/lib/api/client";
import type { ApiGroup, ApiUser } from "@/lib/api/contracts";

export const groupsApi = {
  search: (search = "", token?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    return apiRequest<ApiGroup[]>(`/groups${query}`, { token });
  },
  current: (token?: string) => apiRequest<{ group: ApiGroup | null; membership: unknown | null }>("/groups/me", { token }),
  members: (token?: string) => apiRequest<{ data: ApiUser[]; pagination: { currentPage: number; hasNextPage: boolean; limit: number } }>("/groups/me/members", { token }),

  updateUserGroup: (
    group: { groupId: string | null },
    token?: string,
  ) =>
    apiMutation<ApiUser>("/users/me/group", {
      method: "PATCH",
      token,
      body: group,
      idempotencyKey: undefined,
    }),
};
