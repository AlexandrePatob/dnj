import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameScreen } from "./game-screen";

describe("GameScreen scanner entry", () => {
  beforeEach(() => {
    localStorage.setItem("dnj.game.onboarding.v1.ana@example.com", "1");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 204 }));
  });

  it("keeps scan entry as the orange floating action without a large overview card", () => {
    render(<GameScreen animDir="up" theme="light" onPointsChange={vi.fn()} user={{ name: "Ana", cpf: "", email: "ana@example.com", group: "Chama Viva", points: 10, rankPosition: 1 }} />);
    expect(screen.getByRole("button", { name: "Escanear QR Code" })).toHaveStyle({ background: "var(--primary)" });
    expect(screen.queryByText("Participe de uma atividade e ganhe pontos")).not.toBeInTheDocument();
  });
});
