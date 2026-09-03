import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameScreen } from "./game-screen";

type ScannedValidation = {
  id: string;
  activity: { id: string; name: string };
  place: { id: string; name: string };
  activityKind: "checkpoint" | "challenge" | "competitive" | "live";
  qrAction: "joined" | "scored";
  qrPoints: number;
  checkInPoints: number;
  newTotalPoints?: number;
};

const { scannedValidation } = vi.hoisted(() => ({
  scannedValidation: { current: null as ScannedValidation | null },
}));

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
    currentRun: async (runId?: string) => {
      const response = await fetch(
        `/api/v2/activity-runs/current${runId ? `?runId=${runId}` : ""}`,
      );
      return response.status === 204 ? null : response.json();
    },
  },
}));

vi.mock("@/features/scanner/qr-scanner-modal", () => ({
  QrScannerModal: ({
    onValidated,
  }: {
    onValidated: (value: ScannedValidation) => void | Promise<void>;
  }) => (
    <section aria-label="Escanear QR Code">
      Scanner aberto
      <button
        type="button"
        onClick={() => {
          if (scannedValidation.current) void onValidated(scannedValidation.current);
        }}
      >
        Simular leitura
      </button>
    </section>
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
    scannedValidation.current = null;
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
        momentChallenge={{
          id: "challenge-1",
          title: "Foto com a galera",
          description: "Registre seu grupo",
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
      screen.getByRole("button", { name: "Abrir câmera" }),
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
    expect(screen.getByRole("button", { name: "Abrir câmera" })).toBeInTheDocument();
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
      );

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
    expect(screen.queryByRole("button", { name: "Abrir câmera" })).not.toBeInTheDocument();
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

  it("closes an active Radicalidade panel when the run is no longer active", async () => {
    vi.useFakeTimers();
    try {
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
              status: "active",
              gameName: "Corrida do saco",
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
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(screen.getByRole("dialog", { name: "Status da partida" })).toHaveTextContent("Partida em andamento");

      await act(async () => {
        await Promise.resolve();
        await vi.advanceTimersByTimeAsync(5_000);
      });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(fetchMock).toHaveBeenNthCalledWith(
        4,
        "/api/v2/activity-runs/current?runId=run-1",
      );
      expect(screen.queryByRole("dialog", { name: "Status da partida" })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows a completed Radicalidade run before closing its panel", async () => {
    vi.useFakeTimers();
    try {
      const overview = {
        individual: [],
        groups: [],
        pointEntries: [],
        current: { groupId: null, rankPosition: 1 },
      };
      vi.mocked(fetch)
        .mockResolvedValueOnce(new Response(null, { status: 204 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(overview)))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: "run-1",
              status: "active",
              gameName: "Corrida do saco",
            }),
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: "run-1",
              status: "completed",
              gameName: "Corrida do saco",
              points: 50,
            }),
          ),
        )
        .mockResolvedValueOnce(new Response(JSON.stringify(overview)));

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
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });
      expect(
        screen.getByRole("dialog", { name: "Status da partida" }),
      ).toHaveTextContent("Partida finalizada");
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_000);
      });
      expect(screen.getByLabelText("Pontos creditados")).toHaveTextContent(
        "+50 pontos",
      );

    } finally {
      vi.useRealTimers();
    }
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

  it("confirms a static activity without opening the match status", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ individual: [], groups: [], pointEntries: [], current: { groupId: null, rankPosition: 1 } })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    scannedValidation.current = {
      id: "participation-1",
      activity: { id: "checkpoint-1", name: "Ponto de presença" },
      place: { id: "space-1", name: "Capela" },
      activityKind: "checkpoint",
      qrAction: "scored",
      qrPoints: 15,
      checkInPoints: 15,
      newTotalPoints: 25,
    };

    render(
      <GameScreen
        animDir="up"
        theme="light"
        onPointsChange={vi.fn()}
        user={{ name: "Ana", cpf: "", email: "ana@example.com", group: "Chama Viva", points: 10, rankPosition: 1 }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Escanear QR Code" }));
    await user.click(screen.getByRole("button", { name: "Simular leitura" }));

    expect(await screen.findByLabelText("Pontos creditados")).toHaveTextContent("+15 pontos");
    expect(screen.queryByRole("dialog", { name: "Status da partida" })).not.toBeInTheDocument();
  });

  it("opens the challenge flow instead of the match status", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ individual: [], groups: [], pointEntries: [], current: { groupId: null, rankPosition: 1 } })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    scannedValidation.current = {
      id: "participation-1",
      activity: { id: "challenge-1", name: "Foto com a galera" },
      place: { id: "space-1", name: "Palco" },
      activityKind: "challenge",
      qrAction: "joined",
      qrPoints: 0,
      checkInPoints: 0,
    };

    render(
      <GameScreen
        animDir="up"
        theme="light"
        onPointsChange={vi.fn()}
        user={{ name: "Ana", cpf: "", email: "ana@example.com", group: "Chama Viva", points: 10, rankPosition: 1 }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Escanear QR Code" }));
    await user.click(screen.getByRole("button", { name: "Simular leitura" }));

    expect(await screen.findByRole("button", { name: "Concluir Momento" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Status da partida" })).not.toBeInTheDocument();
  });

  it("keeps opening the match status for a competitive activity", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ individual: [], groups: [], pointEntries: [], current: { groupId: null, rankPosition: 1 } })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "run-1", status: "draft", gameName: "Corrida do saco" })));
    scannedValidation.current = {
      id: "participation-1",
      activity: { id: "competitive-1", name: "Corrida do saco" },
      place: { id: "space-1", name: "Arena" },
      activityKind: "competitive",
      qrAction: "joined",
      qrPoints: 0,
      checkInPoints: 0,
    };

    render(
      <GameScreen
        animDir="up"
        theme="light"
        onPointsChange={vi.fn()}
        user={{ name: "Ana", cpf: "", email: "ana@example.com", group: "Chama Viva", points: 10, rankPosition: 1 }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Escanear QR Code" }));
    await user.click(screen.getByRole("button", { name: "Simular leitura" }));

    expect(await screen.findByRole("dialog", { name: "Status da partida" })).toHaveTextContent("Aguarde o gestor iniciar a atividade");
  });
});
