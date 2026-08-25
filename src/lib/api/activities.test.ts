import { describe, expect, it, vi } from "vitest";
import { activitiesApi } from "./activities";
import { apiRequest } from "./client";
vi.mock("./client", () => ({ apiRequest: vi.fn() }));
describe("activitiesApi", () => { it("encodes optional schedule query", () => { activitiesApi.schedule({ sector: "A/B" }); expect(apiRequest).toHaveBeenCalledWith("/schedule?sector=A%2FB"); }); it("uses V2 activity and space paths", () => { activitiesApi.activity("a/1"); activitiesApi.spaces(); expect(apiRequest).toHaveBeenCalledWith("/activities/a%2F1"); expect(apiRequest).toHaveBeenCalledWith("/spaces"); }); });
