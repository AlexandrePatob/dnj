import { beforeEach, describe, expect, it, vi } from "vitest";
import { favoritesApi } from "./favorites";
import { apiMutation, apiRequest } from "./client";

vi.mock("./client", () => ({ apiRequest: vi.fn(), apiMutation: vi.fn(), newIdempotencyKey: vi.fn(() => "favorite-key") }));

describe("favoritesApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the server favorite state", () => {
    const state = [{ activityId: "a1", favorited: true }];
    vi.mocked(apiRequest).mockReturnValue(state as never);
    expect(favoritesApi.list()).toEqual(state);
    expect(apiRequest).toHaveBeenCalledWith("/favorites", { token: undefined });
  });

  it("adds a favorite with an idempotent PUT", () => {
    favoritesApi.add("activity/1", "session", "key-1");
    expect(apiMutation).toHaveBeenCalledWith("/activities/activity%2F1/favorite", { method: "PUT", token: "session", idempotencyKey: "key-1" });
  });

  it("removes a favorite with an idempotent DELETE", () => {
    favoritesApi.remove("a1", "session", "key-2");
    expect(apiMutation).toHaveBeenCalledWith("/activities/a1/favorite", { method: "DELETE", token: "session", idempotencyKey: "key-2" });
  });
});
