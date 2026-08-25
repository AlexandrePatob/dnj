import { beforeEach, describe, expect, it, vi } from "vitest";
import { profileApi } from "./profile";
import { apiMutation, apiRequest } from "./client";

vi.mock("./client", () => ({ apiRequest: vi.fn(), apiMutation: vi.fn(), newIdempotencyKey: vi.fn(() => "profile-key") }));

describe("profileApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads the masked profile without remapping the document", () => {
    const profile = { id: "u1", documentMasked: "***.***.***-09" };
    vi.mocked(apiRequest).mockReturnValue(profile as never);
    expect(profileApi.current()).toEqual(profile);
    expect(apiRequest).toHaveBeenCalledWith("/users/me", { token: undefined });
    expect(profileApi.current() as unknown as { document?: string }).not.toHaveProperty("document");
  });

  it("updates the profile through the V2 PATCH contract", () => {
    profileApi.update({ name: "Ana", mobilePhone: "+5511999999999" }, "session", "key-1");
    expect(apiMutation).toHaveBeenCalledWith("/users/me", {
      method: "PATCH",
      body: { name: "Ana", mobilePhone: "+5511999999999" },
      token: "session",
      idempotencyKey: "key-1",
    });
  });
});
