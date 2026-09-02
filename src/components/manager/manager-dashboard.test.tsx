import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManagerDashboard } from "./manager-dashboard";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

describe("ManagerDashboard", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });
  it("does not expose unsupported manager scopes", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ name: "Lia", scope: "space" })),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            space: {
              current: {
                id: "1",
                title: "Abertura",
                startsAt: "2026-10-18T14:00:00-03:00",
              },
            },
          }),
        ),
      );
    render(<ManagerDashboard />);
    expect(await screen.findByText("Conta sem escopo")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith("/api/manager/space/start", expect.anything());
  });
  it("recognizes the pastoral queue scope from the manager session", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ name: "Geovane", scope: "pastoral_queue" })),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({})));

    render(<ManagerDashboard />);

    expect(await screen.findByText("Gestor das filas pastorais")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Filas pastorais" })).toBeInTheDocument();
    expect(screen.queryByText("Conta sem escopo")).not.toBeInTheDocument();
  });
  it("operates the Cronometrista actions through the V2 API", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ manager: { name: "Lia", scope: "space" }, name: "Lia", scope: "space" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ scope: "space", space: { current: { id: "item-1", title: "Abertura", startsAt: "2026-10-18T14:00:00Z" }, upcoming: [] } })));
    render(<ManagerDashboard />);
    await user.click(await screen.findByRole("button", { name: "Marcar início real" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v2/manager/space/start", expect.objectContaining({ method: "POST", body: JSON.stringify({ itemId: "item-1" }) })));
  });
  it("starts a Radicalidade run through the API", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ name: "Bia", scope: "actions" })),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            scope: "actions", actions: { games: [{ id: "g1", name: "Corrida do saco" }] },
          }),
        ),
      );
    render(<ManagerDashboard />);
    await screen.findByText("Abrir Radicalidade");
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "run-1" })))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ qrToken: "run-1-token" })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ name: "Bia", scope: "actions" })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ scope: "actions", actions: { games: [] } })),
      );
    await user.click(screen.getByRole("button", { name: "Abrir partida" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v2/manager/runs",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v2/manager/runs/run-1/qr",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sends no JSON body when transitioning a run", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: "Bia", scope: "actions" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ scope: "actions", actions: { games: [], run: { id: "run-1", status: "checkin", participants: [] } } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "run-1", status: "running" })));
    render(<ManagerDashboard />);
    await user.click(await screen.findByRole("button", { name: "Iniciar jogo" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v2/manager/runs/run-1/start", expect.objectContaining({ method: "POST", body: undefined })));
  });

  it("only closes a scored run by confirming all participant results", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: "Bia", scope: "actions" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        scope: "actions", actions: {
          games: [],
          run: {
            id: "run-1",
            status: "running",
            participants: [{ id: "participant-1", name: "Ana" }],
          },
        },
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "run-1", status: "completed" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ scope: "actions", actions: { games: [] } })));

    render(<ManagerDashboard />);
    await user.click(await screen.findByRole("button", { name: "Encerrar e definir pontuação" }));

    expect(screen.getByRole("button", { name: "Confirmar pontuação e encerrar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Fechar partida" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirmar pontuação e encerrar" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v2/manager/runs/run-1/results",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ results: [{ participantId: "participant-1", result: "participation" }] }),
        }),
      ),
    );
  });

  it("edits games in a modal instead of a selector flow", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ name: "Bia", scope: "actions" })),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            scope: "actions", actions: { games: [{ id: "g1", name: "Corrida do saco" }] },
          }),
        ),
      );
    render(<ManagerDashboard />);
    await screen.findByText("Abrir Radicalidade");
    await user.click(
      screen.getByRole("button", { name: "Editar Corrida do saco" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Editar jogo" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Jogo")).not.toBeInTheDocument();
  });

  it("marks a Radicalidade activity as completed", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: "Bia", scope: "actions" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ scope: "actions", actions: { games: [{ id: "g1", name: "Corrida do saco" }] } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "g1", status: "completed" })));
    render(<ManagerDashboard />);
    await user.click(await screen.findByRole("button", { name: "Concluir Corrida do saco" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v2/manager/activities/g1/conclude", expect.objectContaining({ method: "POST", body: undefined })));
  });

  it("creates special events through their existing V2 flow", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: "Nina", scope: "special_events" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ events: [] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "event-1", title: "Caça ao tesouro" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: "Nina", scope: "special_events" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ events: [{ id: "event-1", title: "Caça ao tesouro", status: "draft" }] })));
    render(<ManagerDashboard />);
    expect(await screen.findByRole("heading", { name: "Eventos especiais", level: 1 })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Nome do evento"), "Caça ao tesouro");
    await user.click(screen.getByRole("button", { name: "Criar evento" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v2/manager/special-events", expect.objectContaining({ method: "POST", body: JSON.stringify({ title: "Caça ao tesouro", description: "", durationMinutes: 5, targets: ["app"] }) })));
  });

  it("refreshes checked-in participants while a Radicalidade run is open", async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.mocked(fetch);
      fetchMock
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ name: "Bia", scope: "actions" })),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              scope: "actions", actions: {
                games: [],
                run: {
                  id: "run-1",
                  gameName: "Corrida do saco",
                  status: "checkin",
                  participants: [],
                },
              },
            }),
          ),
        );
      render(<ManagerDashboard />);
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(screen.getByText("Aguardando scans")).toBeInTheDocument();
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            scope: "actions", actions: {
              games: [],
              run: {
                id: "run-1",
                gameName: "Corrida do saco",
                status: "checkin",
                participants: [
                  {
                    id: "user-1",
                    name: "Ana",
                    checkedInAt: "2026-10-18T12:00:00Z",
                  },
                ],
              },
            },
          }),
        ),
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000);
      });
      expect(screen.getByText("Ana")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not stack overview polling while a previous automatic refresh is pending", async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.mocked(fetch);
      fetchMock
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ name: "Bia", scope: "actions" })),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              scope: "actions", actions: {
                games: [],
                run: {
                  id: "run-1",
                  gameName: "Corrida do saco",
                  status: "checkin",
                  participants: [],
                },
              },
            }),
          ),
        )
        .mockImplementation(() => new Promise(() => undefined));
      render(<ManagerDashboard />);
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });

      const overviewCalls = fetchMock.mock.calls.filter(
        ([path]) => path === "/api/v2/manager/game-overview",
      );
      expect(overviewCalls).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
