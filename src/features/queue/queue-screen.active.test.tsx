import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/pastoral-queue/firebase", () => ({ pastoralFirestore: {} }));
vi.mock("@/lib/pastoral-queue/participant-service", () => ({
  getActiveQueue: vi.fn().mockResolvedValue({ id: "queue-1", type: "confession", status: "queued" }),
  joinQueue: vi.fn(),
  leaveQueue: vi.fn(),
}));
vi.mock("@/lib/pastoral-queue/realtime-service", () => ({
  subscribeQueue: vi.fn((_type, onChange) => {
    onChange({ queued: [{ id: "queue-1", participantId: "ana", status: "queued" }], calledEntries: [] });
    return () => undefined;
  }),
}));

import { QueueScreen } from "./queue-screen";

describe("QueueScreen active queue", () => {
  it("restores the participant's active queue instead of showing another queue choice", async () => {
    render(<QueueScreen animDir="up" user={{ id: "ana", name: "Ana" }} />);

    expect(await screen.findByRole("heading", { name: "Confissão" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Entrar na fila/i })).not.toBeInTheDocument();
    expect(screen.getByText("Sua posição na fila")).toBeInTheDocument();
  });
});
