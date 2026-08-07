import { describe, expect, it } from "vitest";

import { actorRoleFromApiRole, isApiUserRole } from "./roles";

describe("DNJ API role compatibility", () => {
  it("maps the API user.role enum to the three application surfaces", () => {
    expect(actorRoleFromApiRole("DEFAULT")).toBe("participant");
    expect(actorRoleFromApiRole("EVENT_MANAGER")).toBe("manager");
    expect(actorRoleFromApiRole("ADMIN")).toBe("admin");
  });

  it("does not accept a frontend-only role as an API role", () => {
    expect(isApiUserRole("EVENT_MANAGER")).toBe(true);
    expect(isApiUserRole("manager")).toBe(false);
  });
});
