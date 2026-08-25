import { describe, expect, it, vi } from "vitest";
import { gameApi } from "./game";
import { apiMutation, apiRequest } from "./client";
vi.mock("./client", () => ({ apiRequest: vi.fn(), apiMutation: vi.fn() }));
describe("gameApi", () => { it("sends only qrToken and an idempotency header", () => { gameApi.validateQr("qr", "key"); expect(apiMutation).toHaveBeenCalledWith("/qr/validate", { method: "POST", body: { qrToken: "qr" }, idempotencyKey: "key" }); }); it("keeps game reads independent", () => { gameApi.overview(); gameApi.currentRun(); gameApi.currentParticipation(); expect(apiRequest).toHaveBeenCalledWith("/game/overview"); expect(apiRequest).toHaveBeenCalledWith("/activity-runs/current"); expect(apiRequest).toHaveBeenCalledWith("/participations/current"); }); });
