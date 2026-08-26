import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveRankingDisplay } from "./live-ranking-display";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("LiveRankingDisplay", () => {
  it("shows the persisted individual ranking when no special event is open", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            updatedAt: "2026-08-05T12:00:00Z",
            rankings: {
              individual: [
                {
                  id: "participant-1",
                  name: "Ana",
                  points: 30,
                  group: "Jovens da Luz",
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
              groups: [],
            },
            specialEvent: null,
          }),
          { status: 200 },
        ),
      ),
    );

    render(<LiveRankingDisplay target="tv" />);

    expect(await screen.findByText("Ana")).toBeInTheDocument();
    expect(screen.getAllByText("Jovens da Luz").length).toBeGreaterThan(0);
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByLabelText("Pódio")).toHaveTextContent("1º lugar");
    expect(screen.getByText("4º")).toBeInTheDocument();
  });

  it("replaces the ranking with the special-event teaser", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            updatedAt: "2026-08-05T12:00:00Z",
            rankings: { individual: [], groups: [] },
            specialEvent: {
              id: "special-1",
              title: "Sala Game",
              status: "teaser",
              points: 50,
              endsAt: "2099-10-18T13:00:00Z",
              readyAt: "2099-10-18T12:00:15Z",
            },
          }),
          { status: 200 },
        ),
      ),
    );

    render(<LiveRankingDisplay target="screen" />);

    expect(await screen.findByText("Sala Game")).toBeInTheDocument();
    expect(
      screen.getByText("Prepare seu celular. O desafio vai começar."),
    ).toBeInTheDocument();
  });
  it("shows the real special-event QR on a live display", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            updatedAt: "2026-08-05T12:00:00Z",
            rankings: { individual: [], groups: [] },
            specialEvent: {
              id: "special-1",
              title: "Chuva de Graça",
              status: "active",
              points: 80,
              endsAt: "2099-10-18T13:00:00Z",
              readyAt: null,
              qrImageUrl: "data:image/png;base64,qr-code",
            },
          }),
          { status: 200 },
        ),
      ),
    );

    render(<LiveRankingDisplay target="screen" />);

    expect(await screen.findByAltText("QR Code para Chuva de Graça")).toHaveAttribute(
      "src",
      "data:image/png;base64,qr-code",
    );
    expect(screen.getByText("Aponte a câmera para o QR Code.")).toBeInTheDocument();
  });
  it("rotates from the individual ranking to the group ranking after 12 seconds", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          updatedAt: "2026-08-05T12:00:00Z",
          rankings: {
            individual: [
              {
                id: "participant-1",
                name: "Ana",
                points: 30,
                group: "Sem grupo",
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
          },
          specialEvent: null,
        }),
        { status: 200 },
      ),
    );
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
});
