import { beforeEach, describe, expect, it, vi } from "vitest";
import { groupsApi } from "./groups";
import { apiMutation, apiRequest } from "./client";
vi.mock("./client", () => ({ apiRequest: vi.fn(), apiMutation: vi.fn() }));
describe("groupsApi", () => {
  beforeEach(() => vi.clearAllMocks());
  it("uses encoded search and omits an empty query", () => { groupsApi.search("A/B"); expect(apiRequest).toHaveBeenCalledWith("/groups?search=A%2FB", { token: undefined }); groupsApi.search(); expect(apiRequest).toHaveBeenLastCalledWith("/groups", { token: undefined }); });
  it("changes the current group through PATCH", () => { groupsApi.updateUserGroup({ groupId: "g1" }); expect(apiMutation).toHaveBeenCalledWith("/users/me/group", expect.objectContaining({ method: "PATCH", body: { groupId: "g1" } })); });
  it("uses the published current-group endpoints and an explicit null to leave", () => { groupsApi.current(); groupsApi.members(); groupsApi.updateUserGroup({ groupId: null }); expect(apiRequest).toHaveBeenCalledWith("/groups/me", { token: undefined }); expect(apiRequest).toHaveBeenCalledWith("/groups/me/members", { token: undefined }); expect(apiMutation).toHaveBeenLastCalledWith("/users/me/group", expect.objectContaining({ body: { groupId: null } })); });
});
