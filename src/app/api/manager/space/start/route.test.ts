import { beforeEach, describe, expect, it, vi } from "vitest";

const { manager, ownScheduleItem, supabaseRest } = vi.hoisted(() => ({ manager: vi.fn(), ownScheduleItem: vi.fn(), supabaseRest: vi.fn() }));
vi.mock("@/lib/manager-api", () => ({ manager, ownScheduleItem, supabaseRest }));
import { POST } from "./route";

describe("POST /api/manager/space/start", () => {
  beforeEach(() => vi.clearAllMocks());
  it("does not update an activity outside the timekeeper scope", async () => {
    manager.mockReturnValue({ session: { sub: "manager-1" } }); ownScheduleItem.mockResolvedValue(null);
    const response = await POST(new Request("http://localhost/api/manager/space/start", { method: "POST", body: JSON.stringify({ itemId: "other-space" }) }));
    if (!response) throw new Error("missing response");
    expect(response.status).toBe(404); expect(supabaseRest).not.toHaveBeenCalled();
  });
});
