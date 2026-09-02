import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MomentComposer } from "./moment-composer";

const { publishFreeMoment, publishChallengeMoment } = vi.hoisted(() => ({
  publishFreeMoment: vi.fn(),
  publishChallengeMoment: vi.fn(),
}));
vi.mock("@/lib/api/media", () => ({
  publishFreeMoment,
  publishChallengeMoment,
}));

const participation = {
  id: "participation-1",
  event: { id: "event-1", name: "DNJ" },
  activity: { id: "activity-1", name: "Foto" },
  place: { id: "place-1", name: "Espaço DNJ" },
  checkedInAt: "2026-08-25T12:00:00.000Z",
  cooldownEndsAt: "2026-08-25T13:00:00.000Z",
  status: "active" as const,
  canShareMoment: true,
  checkInPoints: 10,
};

describe("MomentComposer", () => {
  beforeEach(() => {
    publishFreeMoment.mockReset();
    publishChallengeMoment.mockReset();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:preview"),
      revokeObjectURL: vi.fn(),
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }),
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", {
      configurable: true,
      value: 10,
    });
    Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", {
      configurable: true,
      value: 10,
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback) => callback(new Blob(["photo"], { type: "image/jpeg" })),
    );
  });

  it("shows the upload contract progress and publishes once after capture", async () => {
    const user = userEvent.setup();
    publishFreeMoment.mockImplementation(
      async ({ onProgress }: { onProgress: (value: string) => void }) => {
        for (const state of [
          "hashing",
          "requesting_intent",
          "uploading",
          "completing",
          "publishing",
        ])
          onProgress(state);
        return { id: "moment-1" };
      },
    );
    const onCreated = vi.fn();
    render(<MomentComposer onClose={vi.fn()} onCreated={onCreated} />);

    await user.click(
      await screen.findByRole("button", { name: "Capturar foto" }),
    );
    await user.click(screen.getByRole("button", { name: "Publicar momento" }));
    await waitFor(() => expect(publishFreeMoment).toHaveBeenCalledTimes(1));
    expect(publishFreeMoment.mock.calls[0][0]).toMatchObject({
      publishConsent: true,
    });
    expect(screen.getByText("success")).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("leaves an explicit retry action after a safe publish failure without duplicating the request", async () => {
    const user = userEvent.setup();
    publishFreeMoment.mockRejectedValue(
      new Error("Upload incompleto. Tente publicar novamente."),
    );
    render(<MomentComposer onClose={vi.fn()} onCreated={vi.fn()} />);
    await user.click(
      await screen.findByRole("button", { name: "Capturar foto" }),
    );
    const publish = screen.getByRole("button", {
      name: "Publicar momento",
    });
    await user.click(publish);
    await waitFor(() =>
      expect(
        screen.getByText("Upload incompleto. Tente publicar novamente."),
      ).toBeInTheDocument(),
    );
    expect(publishFreeMoment).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Publicar momento" }),
    ).toBeEnabled();
  });

  it("shows a retryable message when camera startup times out", async () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn(() => new Promise(() => {})) },
    });
    render(<MomentComposer onClose={vi.fn()} onCreated={vi.fn()} />);
    await vi.advanceTimersByTimeAsync(8_000);
    expect(
      screen.getByText("A câmera demorou para responder. Tente novamente."),
    ).toBeInTheDocument();
    vi.useRealTimers();
  });
});
