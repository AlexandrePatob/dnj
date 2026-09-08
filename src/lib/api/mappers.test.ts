import { describe, expect, it } from "vitest";
import { mapIdentityUser } from "./mappers";

describe("mapIdentityUser", () => {
  it("preserves the API groupName used by account and moments", () => {
    const user = mapIdentityUser({
      id: "26",
      email: "joao@gmail.com",
      name: "Joao da Silva",
      avatarUrl: null,
      mobilePhone: "",
      documentMasked: "***",
      role: "DEFAULT",
      group: { id: "4", groupName: "Cursilho" },
      onboardingComplete: true,
    });

    expect(user.group).toEqual({ id: "4", groupName: "Cursilho" });
  });

  it("keeps compatibility with the legacy group name field", () => {
    const user = mapIdentityUser({
      id: "26",
      email: "joao@gmail.com",
      name: "Joao da Silva",
      avatarUrl: null,
      mobilePhone: "",
      documentMasked: "***",
      role: "DEFAULT",
      group: { id: "4", name: "Cursilho" },
      onboardingComplete: true,
    });

    expect(user.group?.groupName).toBe("Cursilho");
  });
});
