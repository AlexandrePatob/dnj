import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LiveStatusStack } from "./live-status-stack";

describe("LiveStatusStack", () => {
  it("keeps the special event above the optional queue summary", () => {
    render(<LiveStatusStack special={{ title: "Desafio relâmpago", status: "active", startsAt: "2026-10-18T17:59:45Z", endsAt: "2026-10-18T18:00:00Z", teaserSeconds: 15, points: 20 }} queueSummary="Fila radical: 8 pessoas" />);
    expect(screen.getByLabelText("Atualizações ao vivo")).toHaveTextContent("Evento especial");
    expect(screen.getByText("Fila radical: 8 pessoas")).toBeInTheDocument();
  });

  it("lets the participant dismiss the special event notice", async () => {
    const user = userEvent.setup();
    render(<LiveStatusStack special={{ id: "special-1", title: "Desafio relâmpago", status: "active", startsAt: "2026-10-18T17:59:45Z", endsAt: "2099-10-18T18:00:00Z", teaserSeconds: 15, points: 20 }} />);

    await user.click(screen.getByRole("button", { name: "Fechar evento especial" }));

    expect(screen.queryByLabelText("Atualizações ao vivo")).not.toBeInTheDocument();
  });

  afterEach(() => vi.useRealTimers());

  it("briefly directs an eligible participant to DNJ Game for a Moment challenge", () => {
    vi.useFakeTimers();
    render(<LiveStatusStack special={null} momentChallenge={{ id: "challenge-1", title: "Foto com a galera", description: "Registre seu grupo", endsAt: "2099-10-18T13:00:00Z", points: 30 }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Desafio Momento DNJ");
    expect(screen.getByRole("status")).toHaveTextContent("Vá ao DNJ Game e compartilhe seu momento.");
    expect(screen.queryByRole("button", { name: "Tirar foto do desafio" })).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(6_000));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not announce an expired Moment challenge", () => {
    render(<LiveStatusStack special={null} momentChallenge={{ id: "challenge-1", title: "Foto com a galera", description: null, endsAt: "2020-10-18T13:00:00Z", points: 30 }} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
