import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SpecialEventQrDisplay } from "./special-event-qr-display";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("SpecialEventQrDisplay", () => {
  it("shows a QR Code supplied during the teaser", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ title: "Teste", status: "teaser", qrImageUrl: "data:image/png;base64,qr" })))));
    render(<SpecialEventQrDisplay />);
    expect(await screen.findByRole("img", { name: "QR Code para Teste" })).toBeInTheDocument();
  });

  it("puts the active challenge title above its QR Code", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ title: "Chuva de Graça", status: "active", qrImageUrl: "data:image/png;base64,qr" })))));
    render(<SpecialEventQrDisplay />);
    expect(await screen.findByRole("img", { name: "QR Code para Chuva de Graça" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Chuva de Graça" }).compareDocumentPosition(screen.getByRole("img"))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
