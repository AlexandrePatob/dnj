import { describe, expect, it, vi } from "vitest";
import { momentsApi } from "./moments";
import { apiMutation, apiRequest } from "./client";
vi.mock("./client", () => ({ apiRequest: vi.fn(), apiMutation: vi.fn() }));
describe("momentsApi", () => { it("passes one supported scope and opaque cursor", () => { momentsApi.list("group", "a/b?c"); expect(apiRequest).toHaveBeenCalledWith("/moments?scope=group&cursor=a%2Fb%3Fc"); }); it("uses idempotent like", () => { momentsApi.like("m1", "key"); expect(apiMutation).toHaveBeenCalledWith("/moments/m1/like", expect.objectContaining({ method: "POST", idempotencyKey: "key" })); }); });
