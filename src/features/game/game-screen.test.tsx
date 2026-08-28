import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameScreen } from "./game-screen";

vi.mock("@/lib/api/game", () => ({
  gameApi: {
    currentParticipation: async () => {
      const response = await fetch("/api/v2/participations/current");
      return response.status === 204 ? null : response.json();
    },
    overview: async () => {
      const response = await fetch("/api/v2/game/overview");
      return response.json();
    },
    currentRun: async () => {
      const response = await fetch("/api/v2/activity-runs/current");
      return response.status === 204 ? null : response.json();
    },
  },
}));

vi.mock("@/features/scanner/qr-scanner-modal", () => ({
  QrScannerModal: () => (
    <section aria-label="Escanear QR Code">Scanner aberto</section>
  ),
}));
vi.mock("@/features/moments/moment-composer", () => ({
  MomentComposer: ({
    onCreated,
  }: {
    onCreated: (moment: { pointsAwarded: number }) => void;
  }) => (
    <button onClick={() => onCreated({ pointsAwarded: 50 })}>
      Concluir Momento
    </button>
  ),
}));

describe("GameScreen scanner entry", () => {
  beforeEach(() => {
    localStorage.setItem("dnj.game.onboarding.v1.ana@example.com", "1");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 204 }));
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  it("keeps scan entry as the orange floating action without a large overview card", () => {
    render(
      <GameScreen
        animDir="up"
        theme="light"
        onPointsChange={vi.fn()}
        user={{
          name: "Ana",
          cpf: "",
          email: "ana@example.com",
          group: "Chama Viva",
          points: 10,
          rankPosition: 1,
        }}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Escanear QR Code" }),
    ).toHaveStyle({ background: "var(--primary)" });
    expect(
      screen.queryByText("Participe de uma atividade e ganhe pontos"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Desafio Momento DNJ")).not.toBeInTheDocument();
  });

  it("keeps the onboarding actions above the bottom navigation and dismisses it", async () => {
    const user = userEvent.setup();
    localStorage.removeItem("dnj.game.onboarding.v1.ana@example.com");

    render(
      <GameScreen
        animDir="up"
        theme="light"
        onPointsChange={vi.fn()}
        user={{
          name: "Ana",
          cpf: "",
          email: "ana@example.com",
          group: "Chama Viva",
          points: 10,
          rankPosition: 1,
        }}
      />,
    );

    expect(
      screen.getByText("Seu caminho no DNJ Game").parentElement?.parentElement,
    ).toHaveClass("pb-[calc(var(--bottom-nav-total-height)+1rem)]");
    await user.click(screen.getByRole("button", { name: "Entendi" }));
    expect(
      screen.queryByText("Seu caminho no DNJ Game"),
    ).not.toBeInTheDocument();
  });

  it("highlights the pending Moment in DNJ Game", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            participation: {
              id: "participation-1",
              canShareMoment: true,
              activity: { id: "challenge-1", name: "Foto com a galera" },
              place: { id: "space-1", name: "Espaço DNJ" },
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            individual: [],
            groups: [],
            pointEntries: [],
            current: { groupId: null, rankPosition: 1 },
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    render(
      <GameScreen
        animDir="up"
        theme="light"
        onPointsChange={vi.fn()}
        user={{
          name: "Ana",
          cpf: "",
          email: "ana@example.com",
          group: "Chama Viva",
          points: 10,
          rankPosition: 1,
        }}
      />,
    );

    expect(await screen.findByText("Desafio Momento DNJ")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Abrir câmera e compartilhar" }),
    ).toBeInTheDocument();
  });

  it("keeps rendering when a QR participation has no activity or place details", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            participation: {
              id: "participation-1",
              activity: null,
              place: null,
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            individual: [],
            groups: [],
            pointEntries: [],
            current: { groupId: null, rankPosition: 1 },
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    render(
      <GameScreen
        animDir="up"
        theme="light"
        onPointsChange={vi.fn()}
        momentChallenge={{
          id: "challenge-1",
          title: "Foto com a galera",
          description: "",
          points: 50,
        }}
        user={{
          name: "Ana",
          cpf: "",
          email: "ana@example.com",
          group: "Chama Viva",
          points: 10,
          rankPosition: 1,
        }}
      />,
    );

    expect(await screen.findByText("Desafio Momento DNJ")).toBeInTheDocument();
    expect(
      screen.getByText("Registre uma foto especial do encontro."),
    ).toBeInTheDocument();
  });

  it("hides the Moment CTA after the photo is published", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            participation: {
              id: "participation-1",
              canShareMoment: true,
              activity: { id: "challenge-1", name: "Foto com a galera" },
              place: { id: "space-1", name: "Espaço DNJ" },
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            individual: [],
            groups: [],
            pointEntries: [],
            current: { groupId: null, rankPosition: 1 },
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    render(
      <GameScreen
        animDir="up"
        theme="light"
        onPointsChange={vi.fn()}
        momentChallenge={{
          id: "challenge-1",
          title: "Foto com a galera",
          description: "",
          points: 50,
        }}
        user={{
          name: "Ana",
          cpf: "",
          email: "ana@example.com",
          group: "Chama Viva",
          points: 10,
          rankPosition: 1,
        }}
      />,
    );

    await user.click(
      await screen.findByRole("button", {
        name: "Abrir câmera",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Concluir Momento" }));
    expect(screen.queryByText("Desafio Momento DNJ")).not.toBeInTheDocument();
  });

  it("blocks scanning offline before opening the camera flow", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });
    render(
      <GameScreen
        animDir="up"
        theme="light"
        onPointsChange={vi.fn()}
        user={{
          name: "Ana",
          cpf: "",
          email: "ana@example.com",
          group: "Chama Viva",
          points: 10,
          rankPosition: 1,
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Escanear QR Code" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Você está offline. Conecte-se à internet para escanear o QR Code.",
    );
    expect(screen.queryByText("Scanner aberto")).not.toBeInTheDocument();
  });

  it("keeps a scanned Radicalidade participant in the waiting state", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            individual: [],
            groups: [],
            pointEntries: [],
            current: { groupId: null, rankPosition: 1 },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "run-1",
            status: "draft",
            gameName: "Corrida do saco",
          }),
        ),
      );
    render(
      <GameScreen
        animDir="up"
        theme="light"
        onPointsChange={vi.fn()}
        user={{
          name: "Ana",
          cpf: "",
          email: "ana@example.com",
          group: "Chama Viva",
          points: 10,
          rankPosition: 1,
        }}
      />,
    );
    expect(
      await screen.findByRole("dialog", { name: "Status da partida" }),
    ).toHaveTextContent("Aguarde o gestor iniciar a atividade");
  });

  it("refreshes the participant total when a Radicalidade run is completed", async () => {
    const onPointsChange = vi.fn();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            individual: [
              {
                id: "ana",
                name: "Ana",
                points: 0,
                group: "Chama Viva",
                isUser: true,
              },
            ],
            groups: [],
            pointEntries: [],
            current: { groupId: null, rankPosition: 1 },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "run-1",
            status: "completed",
            gameName: "Corrida do saco",
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            individual: [
              {
                id: "ana",
                name: "Ana",
                points: 120,
                group: "Chama Viva",
                isUser: true,
              },
            ],
            groups: [],
            pointEntries: [
              { id: "entry-1", label: "Pontos DNJ", points: 120, icon: "qr" },
            ],
            current: { groupId: null, rankPosition: 1 },
          }),
        ),
      );

    render(
      <GameScreen
        animDir="up"
        theme="light"
        onPointsChange={onPointsChange}
        user={{
          name: "Ana",
          cpf: "",
          email: "ana@example.com",
          group: "Chama Viva",
          points: 0,
          rankPosition: 1,
        }}
      />,
    );

    await waitFor(() => expect(onPointsChange).toHaveBeenCalledWith(120));
    expect(await screen.findByText("+120")).toBeInTheDocument();
  });
});
