import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LiveStatusStack } from "./live-status-stack";

describe("LiveStatusStack", () => {
  it("keeps the special event above the optional queue summary", () => {
    render(<LiveStatusStack special={{ title: "Desafio relâmpago", status: "active", startsAt: "2026-10-18T17:59:45Z", endsAt: "2026-10-18T18:00:00Z", teaserSeconds: 15, points: 20 }} queueNotification={{ title: "Fila radical", body: "8 pessoas" }} />);
    expect(screen.getByLabelText("Atualizações ao vivo")).toHaveTextContent("Evento especial");
    expect(screen.getByText("Fila radical")).toBeInTheDocument();
    expect(screen.getByText("8 pessoas")).toBeInTheDocument();
  });

  it("shows only the timer and stays visible until the special event ends", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-18T18:00:00Z"));
    render(<LiveStatusStack special={{ id: "special-1", title: "Desafio relâmpago", status: "active", startsAt: "2026-10-18T17:59:45Z", endsAt: "2026-10-18T18:00:05Z", teaserSeconds: 15, points: 20 }} />);

    expect(screen.getByLabelText("Atualizações ao vivo")).toHaveTextContent("Encerra em 0:05");
    expect(screen.queryByText(/QR/i)).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(4_000));
    expect(screen.getByLabelText("Atualizações ao vivo")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.queryByLabelText("Atualizações ao vivo")).not.toBeInTheDocument();
  });

  it("lets the participant close the special event notice", async () => {
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
    expect(screen.getByRole("status")).toHaveTextContent("Abra o DNJ Game para participar.");
    expect(screen.queryByRole("button", { name: "Tirar foto do desafio" })).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(6_000));
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("does not announce an expired Moment challenge", () => {
    render(<LiveStatusStack special={null} momentChallenge={{ id: "challenge-1", title: "Foto com a galera", description: null, endsAt: "2020-10-18T13:00:00Z", points: 30 }} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("offers actions only for Moment and queue notifications", async () => {
    const user = userEvent.setup();
    const onOpenGame = vi.fn();
    const onOpenQueue = vi.fn();
    const onReadAdmin = vi.fn();
    render(
      <LiveStatusStack
        special={null}
        momentChallenge={{ id: "challenge-1", title: "Foto com a galera", description: null, endsAt: "2099-10-18T13:00:00Z", points: 30 }}
        queueNotification={{ title: "Atualização da fila", body: "Chegou sua vez." }}
        adminNotification={{ id: "admin-1", title: "Aviso", body: "O evento começa às 14h." }}
        onOpenGame={onOpenGame}
        onOpenQueue={onOpenQueue}
        onReadAdmin={onReadAdmin}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Ver desafio" }));
    await user.click(screen.getByRole("button", { name: /Ver fila/ }));

    expect(onOpenGame).toHaveBeenCalledOnce();
    expect(screen.queryByText("Desafio Momento DNJ")).not.toBeInTheDocument();
    expect(onOpenQueue).toHaveBeenCalledOnce();
    await user.click(screen.getByLabelText("Ler notificação: Aviso"));
    expect(onReadAdmin).toHaveBeenCalledWith("admin-1");
    const adminNotice = screen.getByText("O evento começa às 14h.").closest("section");
    expect(adminNotice).not.toBeNull();
    expect(within(adminNotice as HTMLElement).queryByRole("button")).not.toBeInTheDocument();
  });
});
