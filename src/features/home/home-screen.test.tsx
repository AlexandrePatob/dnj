import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { scheduleApi } from "@/lib/api/schedule";
import { HomeScreen } from "./home-screen";

vi.mock("@/lib/api/schedule", () => ({ scheduleApi: { list: vi.fn() } }));

describe("HomeScreen", () => {
  it("updates the journey from real points and opens the game, including zero and maximum level", async () => {
    const onOpenGame = vi.fn();
    const participant = { name: "Ana", cpf: "", email: "", group: "", points: 0, rankPosition: 1 };
    const props = { animDir: "up" as const, onOpenSchedule: vi.fn(), onOpenMap: vi.fn(), onOpenGame, onOpenAccount: vi.fn() };
    const { rerender } = render(<HomeScreen {...props} user={participant} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0");
    expect(screen.getByLabelText("Iniciante: nível atual")).toHaveAttribute("aria-current", "step");
    rerender(<HomeScreen {...props} user={{ ...participant, points: 320 }} />);
    expect(screen.getByText("320 / 350 pts")).toBeInTheDocument();
    expect(screen.getByLabelText("Discípulo: nível atual")).toHaveAttribute("aria-current", "step");
    expect(screen.getByLabelText("Missionário: bloqueado, 350 pontos")).toBeInTheDocument();
    expect(Number(screen.getByRole("progressbar").getAttribute("value"))).toBe(80);
    await userEvent.click(screen.getByRole("button", { name: "Ver evolução" }));
    expect(onOpenGame).toHaveBeenCalledOnce();
    rerender(<HomeScreen {...props} user={{ ...participant, points: 800 }} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "100");
    expect(screen.getByText(/Você completou todas as etapas/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/bloqueado/)).not.toBeInTheDocument();
  });

  beforeEach(() => {
    vi.mocked(scheduleApi.list).mockResolvedValue({
      generatedAt: "2026-10-18T12:00:00.000Z",
      items: [
        {
          id: "opening",
          title: "Abertura",
          description: "Apresentadores",
          startsAt: "2026-10-18T12:00:00.000Z",
          endsAt: "2026-10-18T12:15:00.000Z",
          sector: {
            id: "stage",
            name: "Palco Principal",
            slug: "palco-principal",
          },
          state: "live",
        },
        {
          id: "animation",
          title: "Animação da Manhã",
          description: "Arautos",
          startsAt: "2026-10-18T12:15:00.000Z",
          endsAt: "2026-10-18T13:00:00.000Z",
          sector: {
            id: "stage",
            name: "Palco Principal",
            slug: "palco-principal",
          },
          state: "upcoming",
        },
      ],
    });
  });

  it("renders simultaneous API schedule items and one complete-schedule action without the retired mission cards", async () => {
    const user = userEvent.setup();
    const onOpenSchedule = vi.fn();
    const onOpenMap = vi.fn();
    render(
      <HomeScreen
        user={{
          name: "Ana",
          cpf: "",
          email: "",
          group: "",
          points: 10,
          rankPosition: 1,
        }}
        animDir="up"
        onOpenSchedule={onOpenSchedule}
        onOpenMap={onOpenMap}
        onOpenGame={vi.fn()}
        onOpenAccount={vi.fn()}
      />,
    );

    expect(await screen.findByText("Abertura")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Olá, Ana!" })).toBeInTheDocument();
    expect(screen.getByText("ACONTECENDO AGORA")).toBeInTheDocument();
    expect(screen.queryByText("Animação da Manhã")).not.toBeInTheDocument();
    expect(screen.queryByText("EM SEGUIDA")).not.toBeInTheDocument();
    expect(screen.getByText("Minha jornada")).toBeInTheDocument();
    expect(screen.getByText(/Nível Iniciante/)).toBeInTheDocument();
    expect(screen.getByLabelText("Progresso da jornada")).toBeInTheDocument();
    expect(screen.queryByText(/MISSÃO ATIVA/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Cronograma do Evento")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Ver programação completa" }),
    );
    expect(onOpenSchedule).toHaveBeenCalledOnce();
    expect(screen.queryByRole("img", { name: "Mapa isométrico oficial do evento DNJ 2026" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    expect(onOpenMap).toHaveBeenCalledOnce();
  });
});
