import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { scheduleApi } from "@/lib/api/schedule";
import { HomeScreen } from "./home-screen";

vi.mock("@/lib/api/schedule", () => ({ scheduleApi: { list: vi.fn() } }));

describe("HomeScreen", () => {
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
      />,
    );

    expect(await screen.findByText("Abertura")).toBeInTheDocument();
    expect(screen.getByText("ACONTECENDO AGORA")).toBeInTheDocument();
    expect(screen.getByText("Animação da Manhã")).toBeInTheDocument();
    expect(screen.getByText("Nível Iniciante")).toBeInTheDocument();
    expect(screen.queryByText(/MISSÃO ATIVA/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Cronograma do Evento")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Ver cronograma completo" }),
    );
    expect(onOpenSchedule).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    expect(onOpenMap).toHaveBeenCalledOnce();
  });
});
