import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

    expect(await screen.findByText("Gestor das filas")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Filas" })).toBeInTheDocument();
    expect(screen.queryByText("Conta sem escopo")).not.toBeInTheDocument();
  });
  it("operates the Cronometrista actions through the V2 API", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ manager: { name: "Lia", scope: "space" }, name: "Lia", scope: "space" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ scope: "space", space: { now: [], upcoming: [{ id: "item-1", title: "Abertura", startsAt: "2999-10-18T14:00:00Z", endsAt: "2999-10-18T15:00:00Z", status: "active", spaceName: "Palco Juventude" }] } })));
    render(<ManagerDashboard />);
    await user.click(await screen.findByRole("button", { name: "Iniciar agora" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v2/manager/space/start", expect.objectContaining({ method: "POST", body: JSON.stringify({ itemId: "item-1" }) })));
  });
  it("shows simultaneous activities and adjusts a real start time", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: "Lia", scope: "space" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        scope: "space",
        space: {
          now: [
            { id: "now-a", title: "Abertura", status: "active", spaceName: "Palco A", startsAt: "2026-10-18T14:00:00Z", endsAt: "2026-10-18T15:00:00Z" },
            { id: "now-b", title: "Recepção", status: "paused", spaceName: "Palco B", startsAt: "2026-10-18T14:00:00Z", endsAt: "2026-10-18T15:00:00Z", startedAt: "2026-10-18T14:05:00Z" },
          ],
          upcoming: [{ id: "next-a", title: "Adoração", status: "active", spaceName: "Palco A", startsAt: "2026-10-18T15:00:00Z", endsAt: "2026-10-18T16:00:00Z" }],
        },
      })))
      .mockResolvedValue(new Response(JSON.stringify({ scope: "space", space: { now: [], upcoming: [] } })));
    render(<ManagerDashboard />);
    expect(await screen.findByText("Abertura")).toBeInTheDocument();
    expect(screen.getByText("Recepção")).toBeInTheDocument();
    expect(screen.getByText("Próximas atividades por espaço")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Ajustar início" })[0]);
    expect(screen.getByRole("dialog", { name: "Início real" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Salvar início" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v2/manager/space/start", expect.objectContaining({ method: "POST" })));
    const request = fetchMock.mock.calls.find(([path]) => path === "/api/v2/manager/space/start");
    expect(request?.[1]?.body).toMatch(/"itemId":"now-a"/);
    expect(request?.[1]?.body).toMatch(/"startedAt":"/);
  });
  it("only offers manual adjustment after the planned start time", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: "Lia", scope: "space" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ scope: "space", space: { now: [{ id: "late", title: "Atrasada", status: "active", spaceName: "Palco A", startsAt: "2020-10-18T14:00:00Z", endsAt: "2999-10-18T15:00:00Z" }], upcoming: [] } })));
    render(<ManagerDashboard />);
    expect(await screen.findByText("Atrasada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iniciar agora" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajustar início" })).toBeInTheDocument();
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
            scope: "actions", actions: { games: [{ id: "g1", name: "Corrida do saco", run: null }] },
          }),
        ),
      );
    render(<ManagerDashboard />);
    await screen.findByRole("heading", { name: "Partidas" });
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

  it("renders and operates multiple Radicalidade games independently", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: "Bia", scope: "actions" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        scope: "actions",
        actions: {
          games: [
            { id: "g1", name: "Corrida do saco", run: null },
            { id: "g2", name: "Cabo de guerra", run: { id: "run-2", gameId: "g2", gameName: "Cabo de guerra", status: "checkin", participants: [{ id: "p1", name: "Ana" }] } },
          ],
        },
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "run-2", status: "running" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: "Bia", scope: "actions" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ scope: "actions", actions: { games: [] } })));

    render(<ManagerDashboard />);

    expect(await screen.findByText("Corrida do saco")).toBeInTheDocument();
    expect(screen.getByText("Cabo de guerra")).toBeInTheDocument();
    expect(screen.getByText("Disponível para abrir")).toBeInTheDocument();
    expect(screen.getByText("Partida aberta")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Gerenciar partida" }));
    expect(screen.queryByRole("heading", { name: "Abrir Radicalidade" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voltar para atividades" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Iniciar jogo" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/v2/manager/runs/run-2/start",
      expect.objectContaining({ method: "POST", body: undefined }),
    ));
  });

  it("sends no JSON body when transitioning a run", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: "Bia", scope: "actions" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ scope: "actions", actions: { games: [{ id: "g1", name: "Corrida do saco", run: { id: "run-1", status: "checkin", participants: [] } }] } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "run-1", status: "running" })));
    render(<ManagerDashboard />);
    await user.click(await screen.findByRole("button", { name: "Gerenciar partida" }));
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
          games: [{ id: "g1", name: "Corrida do saco", run: {
            id: "run-1",
            status: "running",
            participants: [{ id: "participant-1", name: "Ana" }],
          } }],
        },
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "run-1", status: "completed" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ scope: "actions", actions: { games: [] } })));

    render(<ManagerDashboard />);
    await user.click(await screen.findByRole("button", { name: "Gerenciar partida" }));
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

  it("keeps podium positions unique while allowing repeated participation", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: "Bia", scope: "actions" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        scope: "actions", actions: { games: [{ id: "g1", name: "Corrida do saco", run: {
          id: "run-1", status: "results", participants: [
            { id: "p1", name: "Ana" },
            { id: "p2", name: "Bruno" },
            { id: "p3", name: "Carla" },
          ],
        } }] },
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "run-1", status: "completed" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ scope: "actions", actions: { games: [] } })));

    render(<ManagerDashboard />);
    await user.click(await screen.findByRole("button", { name: "Gerenciar partida" }));
    const firstPlaceButtons = screen.getAllByRole("radio", { name: "1º" });
    const participationButtons = screen.getAllByRole("radio", { name: "Participa" });

    await user.click(firstPlaceButtons[0]);
    expect(firstPlaceButtons[1]).toBeDisabled();
    expect(participationButtons[1]).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Confirmar pontuação e encerrar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/v2/manager/runs/run-1/results",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ results: [
          { participantId: "p1", result: "first" },
          { participantId: "p2", result: "participation" },
          { participantId: "p3", result: "participation" },
        ] }),
      }),
    ));
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
            scope: "actions", actions: { games: [{ id: "g1", name: "Corrida do saco", run: null }] },
          }),
        ),
      );
    render(<ManagerDashboard />);
    await screen.findByRole("heading", { name: "Partidas" });
    await user.click(screen.getByRole("button", { name: "Editar nome" }));
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
      .mockResolvedValueOnce(new Response(JSON.stringify({ scope: "actions", actions: { games: [{ id: "g1", name: "Corrida do saco", run: null }] } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "g1", status: "completed" })));
    render(<ManagerDashboard />);
    await user.click(await screen.findByRole("button", { name: "Encerrar atividade" }));
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
    expect(fetchMock).not.toHaveBeenCalledWith("/api/v2/manager/special-events/teaser", expect.anything());
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
                games: [{ id: "g1", name: "Corrida do saco", run: {
                  id: "run-1",
                  gameName: "Corrida do saco",
                  status: "checkin",
                  participants: [],
                } }],
              },
            }),
          ),
        );
      render(<ManagerDashboard />);
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Gerenciar partida" }));
      });
      expect(screen.getByText("Aguardando scans")).toBeInTheDocument();
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            scope: "actions", actions: {
              games: [{ id: "g1", name: "Corrida do saco", run: {
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
              } }],
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
