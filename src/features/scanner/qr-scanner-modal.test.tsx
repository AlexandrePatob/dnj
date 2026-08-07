import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QrScannerModal } from "./qr-scanner-modal";

const decodeFromConstraints = vi.fn();

vi.mock("@zxing/browser", () => ({
  BrowserQRCodeReader: class { decodeFromConstraints = decodeFromConstraints; },
}));

describe("QrScannerModal", () => {
  it("keeps the scanner open with a recovery action after QR validation fails", async () => {
    decodeFromConstraints.mockImplementationOnce(async (_constraints: unknown, _video: unknown, onResult: (result: { getText: () => string }) => void) => {
      onResult({ getText: () => "invalid-token" });
      return { stop: vi.fn() };
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ code: "INVALID_QR", message: "Este QR Code não é válido." }) }));
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn() } });
    vi.stubGlobal("MediaStream", class {});

    render(<QrScannerModal onClose={vi.fn()} onValidated={vi.fn()} />);

    expect(await screen.findByText("Este QR Code não é válido.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar câmera" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trocar câmera" })).toBeInTheDocument();
  });
});
