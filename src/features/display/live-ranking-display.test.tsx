import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveRankingDisplay } from "./live-ranking-display";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("LiveRankingDisplay", () => {
  function displayFetch({
    individual = [],
    groups = [],
    specialEvent = null,
  }: {
    individual?: unknown[];
    groups?: unknown[];
    specialEvent?: unknown;
  }) {
    return vi.fn((input: string) => {
      if (input.includes("scope=individual"))
        return Promise.resolve(new Response(JSON.stringify({ data: individual }), { status: 200 }));
      if (input.includes("scope=groups"))
        return Promise.resolve(new Response(JSON.stringify({ data: groups }), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify(specialEvent), { status: 200 }));
    });
  }

  it("shows the persisted individual ranking when no special event is open", async () => {
    vi.stubGlobal("fetch", displayFetch({
      individual: [
                {
                  id: "participant-1",
                  name: "Ana",
                  points: 30,
                  groupName: "Jovens da Luz",
                },
                {
                  id: "participant-2",
                  name: "Bia",
                  points: 25,
                  group: "Jovens da Luz",
                },
                {
                  id: "participant-3",
                  name: "Caio",
                  points: 20,
                  group: "Jovens da Luz",
                },
                {
                  id: "participant-4",
                  name: "Duda",
                  points: 15,
                  group: "Jovens da Luz",
                },
              ],
    }));

    render(<LiveRankingDisplay target="tv" />);

    expect(await screen.findByText("Ana")).toBeInTheDocument();
    expect(screen.getAllByText("Jovens da Luz").length).toBeGreaterThan(0);
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByLabelText("Pódio")).toHaveTextContent("1º lugar");
    expect(screen.queryByText("4º")).not.toBeInTheDocument();
  });

  it("replaces the ranking with the special-event teaser", async () => {
    vi.stubGlobal("fetch", displayFetch({
      specialEvent: {
              id: "special-1",
              title: "Sala Game",
              status: "teaser",
              points: 50,
              endsAt: "2099-10-18T13:00:00Z",
              readyAt: "2099-10-18T12:00:15Z",
      },
    }));

    render(<LiveRankingDisplay target="screen" />);

    expect(await screen.findByText("Sala Game")).toBeInTheDocument();
    expect(
      screen.getByText("Prepare seu celular. O desafio vai começar."),
    ).toBeInTheDocument();
  });
  it("shows the real special-event QR on a live display", async () => {
    vi.stubGlobal("fetch", displayFetch({
      specialEvent: {
              id: "special-1",
              title: "Chuva de Graça",
              status: "active",
              points: 80,
              endsAt: "2099-10-18T13:00:00Z",
              readyAt: null,
              qrImageUrl: "data:image/png;base64,qr-code",
      },
    }));

    render(<LiveRankingDisplay target="screen" />);

    expect(await screen.findByAltText("QR Code para Chuva de Graça")).toHaveAttribute(
      "src",
      "data:image/png;base64,qr-code",
    );
    expect(screen.getByText("Aponte a câmera para o QR Code.")).toBeInTheDocument();
  });
  it("rotates from the individual ranking to the group ranking after 12 seconds", async () => {
    vi.useFakeTimers();
    const fetchMock = displayFetch({
      individual: [
              {
                id: "participant-1",
                name: "Ana",
                points: 30,
                groupName: "Sem grupo",
              },
            ],
      groups: [
              {
                id: "group-1",
                name: "Jovens da Luz",
                members: 2,
                points: 50,
              },
            ],
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LiveRankingDisplay target="tv" />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(
      screen.getByRole("heading", { name: "Ranking individual" }),
    ).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(12_000);
    });
    expect(
      screen.getByRole("heading", { name: "Ranking dos grupos" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("renders the horizontal backdrop format for the stage screen", async () => {
    vi.stubGlobal("fetch", displayFetch({}));
    render(<LiveRankingDisplay target="screen" screenFormat="backdrop" />);
    expect(await screen.findByText("Telão · Fundo")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveStyle({ aspectRatio: "5 / 2" });
  });

  it("limits the display to the three podium positions", async () => {
    vi.stubGlobal("fetch", displayFetch({
      individual: Array.from({ length: 9 }, (_, index) => ({
        id: `participant-${index + 1}`,
        name: `Participante ${index + 1}`,
        points: 90 - index,
        groupName: "DNJ",
      })),
    }));

    render(<LiveRankingDisplay target="screen" screenFormat="backdrop" />);

    expect(await screen.findByText("Participante 1")).toBeInTheDocument();
    expect(screen.queryByText("Participante 9")).not.toBeInTheDocument();
  });
});
