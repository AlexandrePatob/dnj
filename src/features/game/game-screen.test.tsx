import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameScreen } from "./game-screen";

vi.mock("@/features/scanner/qr-scanner-modal", () => ({
  QrScannerModal: () => <section aria-label="Escanear QR Code">Scanner aberto</section>,
}));

describe("GameScreen scanner entry", () => {
  beforeEach(() => {
    localStorage.setItem("dnj.game.onboarding.v1.ana@example.com", "1");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 204 }));
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  it("keeps scan entry as the orange floating action without a large overview card", () => {
    render(<GameScreen animDir="up" theme="light" onPointsChange={vi.fn()} user={{ name: "Ana", cpf: "", email: "ana@example.com", group: "Chama Viva", points: 10, rankPosition: 1 }} />);
    expect(screen.getByRole("button", { name: "Escanear QR Code" })).toHaveStyle({ background: "var(--primary)" });
    expect(screen.queryByText("Participe de uma atividade e ganhe pontos")).not.toBeInTheDocument();
  });

  it("blocks scanning offline before opening the camera flow", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    render(<GameScreen animDir="up" theme="light" onPointsChange={vi.fn()} user={{ name: "Ana", cpf: "", email: "ana@example.com", group: "Chama Viva", points: 10, rankPosition: 1 }} />);

    await user.click(screen.getByRole("button", { name: "Escanear QR Code" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Você está offline. Conecte-se à internet para escanear o QR Code.");
    expect(screen.queryByText("Scanner aberto")).not.toBeInTheDocument();
  });
});
