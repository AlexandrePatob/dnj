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
      .mockResolvedValueOnce(new Response(JSON.stringify({})))
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
        await vi.advanceTimersByTimeAsync(2_000);
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
        await vi.advanceTimersByTimeAsync(2_000);
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
