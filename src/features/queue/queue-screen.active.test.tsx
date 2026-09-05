import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
import { getActiveQueue, joinQueue, leaveQueue } from "@/lib/pastoral-queue/participant-service";
import { subscribeQueue, type QueueSnapshot } from "@/lib/pastoral-queue/realtime-service";
import type { QueueEntry } from "@/lib/pastoral-queue/types";

const entry: QueueEntry = { id: "queue-1", participantId: "ana", participantName: "Ana", type: "confession", status: "queued", createdAt: {} as QueueEntry["createdAt"], notificationMilestones: {} };
const snapshot = (queued: QueueSnapshot["queued"] = []): QueueSnapshot => ({ type: "confession", queued, called: null, calledEntries: [], totalWaiting: queued.length });

describe("QueueScreen active queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getActiveQueue).mockResolvedValue(entry);
    vi.mocked(joinQueue).mockResolvedValue(entry);
    vi.mocked(subscribeQueue).mockImplementation((_type, onChange) => {
      onChange(snapshot([entry]));
      return vi.fn();
    });
  });

  it("restores the participant's active queue instead of showing another queue choice", async () => {
    render(<QueueScreen animDir="up" user={{ id: "ana", name: "Ana" }} />);

    expect(await screen.findByRole("heading", { name: "Confissão" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Entrar na fila/i })).not.toBeInTheDocument();
    expect(screen.getByText("Sua posição na fila")).toBeInTheDocument();
  });

  it.each(["Confissão", "Direção Espiritual"])("only tracks %s after joining, keeping preparation open", async (label) => {
    vi.mocked(getActiveQueue).mockResolvedValue(null);
    const user = userEvent.setup();
    render(<QueueScreen animDir="up" user={{ id: "ana", name: "Ana" }} />);

    await user.click(await screen.findByRole("button", { name: `Preparar para ${label}` }));
    expect(screen.getByRole("heading", { name: "Antes de entrar" })).toBeInTheDocument();
    expect(subscribeQueue).not.toHaveBeenCalled();
    expect(joinQueue).not.toHaveBeenCalled();
    expect(screen.queryByText("Atendimento encerrado")).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: `Entrar na fila de ${label}` }));
    expect(joinQueue).toHaveBeenCalledOnce();
    expect(subscribeQueue).toHaveBeenCalledOnce();
    expect(await screen.findByText("Sua posição na fila")).toBeInTheDocument();
  });

  it("keeps tracking when a partial update omits an active participant", async () => {
    vi.mocked(subscribeQueue).mockImplementation((_type, onChange) => {
      onChange(snapshot());
      return vi.fn();
    });
    render(<QueueScreen animDir="up" user={{ id: "ana", name: "Ana" }} />);

    await waitFor(() => expect(getActiveQueue).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("Atendimento encerrado")).not.toBeInTheDocument();
    const onChange = vi.mocked(subscribeQueue).mock.calls[0][1];
    act(() => onChange(snapshot([entry])));
    expect(screen.getByText("Sua posição na fila")).toBeInTheDocument();

    vi.mocked(getActiveQueue).mockResolvedValue(null);
    act(() => onChange(snapshot()));
    expect(await screen.findByText("Atendimento encerrado")).toBeInTheDocument();
  });

  it("ignores an outdated absence check after the participant is called", async () => {
    render(<QueueScreen animDir="up" user={{ id: "ana", name: "Ana" }} />);
    await screen.findByText("Sua posição na fila");
    let resolveCheck!: (entry: null) => void;
    vi.mocked(getActiveQueue).mockReturnValueOnce(new Promise((resolve) => { resolveCheck = resolve; }));
    const onChange = vi.mocked(subscribeQueue).mock.calls[0][1];
    act(() => onChange(snapshot()));
    const called = { ...entry, status: "called" as const };
    act(() => onChange({ ...snapshot(), called, calledEntries: [called] }));
    await act(async () => { resolveCheck(null); });

    expect(screen.getByText("Sua vez!")).toBeInTheDocument();
    expect(screen.queryByText("Atendimento encerrado")).not.toBeInTheDocument();
  });

  it("blocks a second join while the first Firebase request is pending", async () => {
    const user = userEvent.setup();
    let resolveJoin!: (value: QueueEntry) => void;
    vi.mocked(getActiveQueue).mockResolvedValue(null);
    vi.mocked(joinQueue).mockImplementationOnce(() => new Promise((resolve) => { resolveJoin = resolve; }));
    vi.mocked(subscribeQueue).mockReturnValue(vi.fn());
    render(<QueueScreen animDir="up" user={{ id: "ana", name: "Ana" }} />);

    await user.click(await screen.findByRole("button", { name: "Preparar para Confissão" }));
    await user.click(screen.getByRole("checkbox"));
    const joinButton = screen.getByRole("button", { name: "Entrar na fila de Confissão" });
    await user.click(joinButton);

    expect(joinButton).toBeDisabled();
    await user.click(joinButton);
    expect(joinQueue).toHaveBeenCalledOnce();

    resolveJoin(entry);
    expect(await screen.findByText(/Você entrou na fila/i)).toBeInTheDocument();
  });

  it("does not flash completion before the first snapshot confirms a new entry", async () => {
    const user = userEvent.setup();
    vi.mocked(getActiveQueue).mockResolvedValue(null);
    vi.mocked(subscribeQueue).mockImplementation((_type, onChange) => {
      onChange(snapshot());
      return vi.fn();
    });
    render(<QueueScreen animDir="up" user={{ id: "ana", name: "Ana" }} />);

    await user.click(await screen.findByRole("button", { name: "Preparar para Confissão" }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Entrar na fila de Confissão" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Atualizando sua posição na fila…");
    expect(screen.queryByText("Atendimento encerrado")).not.toBeInTheDocument();
    expect(getActiveQueue).toHaveBeenCalledTimes(1);
  });

  it("keeps tracking visible and explains when Firebase cannot cancel the queue", async () => {
    const user = userEvent.setup();
    vi.mocked(leaveQueue).mockRejectedValueOnce(new Error("Firebase indisponível"));
    render(<QueueScreen animDir="up" user={{ id: "ana", name: "Ana" }} />);

    await user.click(await screen.findByRole("button", { name: "Sair da fila" }));
    await user.click(screen.getByRole("button", { name: "Confirmar saída" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Firebase indisponível");
    expect(screen.getByRole("heading", { name: "Confissão" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sair da fila" })).toBeEnabled();
  });

  it("shows a loading state while an existing queue waits for its first Firebase snapshot", async () => {
    vi.mocked(subscribeQueue).mockReturnValue(vi.fn());
    render(<QueueScreen animDir="up" user={{ id: "ana", name: "Ana" }} />);

    expect(await screen.findByText("Atualizando sua posição na fila…")).toBeInTheDocument();
  });
});
