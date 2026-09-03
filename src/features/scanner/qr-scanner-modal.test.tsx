import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QrScannerModal } from "./qr-scanner-modal";

const { validateQr } = vi.hoisted(() => ({ validateQr: vi.fn() }));
vi.mock("@/lib/api/game", () => ({ gameApi: { validateQr } }));

const { decodeFromConstraints } = vi.hoisted(() => ({ decodeFromConstraints: vi.fn() }));

vi.mock("@zxing/browser", () => ({
  BrowserQRCodeReader: class { decodeFromConstraints = decodeFromConstraints; },
}));

describe("QrScannerModal", () => {
  it("keeps the scanner open with a recovery action after QR validation fails", async () => {
    decodeFromConstraints.mockImplementationOnce(async (_constraints: unknown, _video: unknown, onResult: (result: { getText: () => string }) => void) => {
      window.setTimeout(() => onResult({ getText: () => "invalid-token" }), 0);
      return { stop: vi.fn() };
    });
    validateQr.mockRejectedValueOnce({ code: "INVALID_QR", message: "Este QR Code não é válido." });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn() } });
    vi.stubGlobal("MediaStream", class {});

    render(<QrScannerModal onClose={vi.fn()} onValidated={vi.fn()} />);

    expect(await screen.findByText("Este QR Code não é válido.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar câmera" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trocar câmera" })).toBeInTheDocument();
  });

  it("passes the activity kind from QR validation to the participant flow", async () => {
    vi.useFakeTimers();
    try {
      decodeFromConstraints.mockImplementationOnce(async (_constraints: unknown, _video: unknown, onResult: (result: { getText: () => string }) => void) => {
        window.setTimeout(() => onResult({ getText: () => "challenge-token" }), 0);
        return { stop: vi.fn() };
      });
      validateQr.mockResolvedValueOnce({
        participation: { id: "participation-1", activity: { id: "challenge-1", name: "Foto com a galera" }, place: null, checkInPoints: 0 },
        activityKind: "challenge",
        action: "joined",
        pointsAwarded: 0,
      });
      Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn() } });
      vi.stubGlobal("MediaStream", class {});
      const onValidated = vi.fn();

      render(<QrScannerModal onClose={vi.fn()} onValidated={onValidated} />);
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(onValidated).toHaveBeenCalledWith(expect.objectContaining({ activityKind: "challenge", qrAction: "joined", qrPoints: 0 }));
    } finally {
      vi.useRealTimers();
    }
  });

});
