import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { scheduleApi } from "@/lib/api/schedule";
import { EventScheduleScreen } from "./schedule-screen";

vi.mock("@/lib/api/schedule", () => ({ scheduleApi: { list: vi.fn() } }));

describe("EventScheduleScreen", () => {
  beforeEach(() => {
    vi.mocked(scheduleApi.list).mockResolvedValue({
      generatedAt: "2026-10-18T12:00:00.000Z",
      items: [
        { id: "radical", title: "Missão Radical", description: null, startsAt: "2026-10-18T13:00:00.000Z", endsAt: "2026-10-18T14:00:00.000Z", sector: { id: "radical", name: "Radicalidade", slug: "espaco-radicalidade" }, state: "scheduled" },
        { id: "opening", title: "Abertura", description: null, startsAt: "2026-10-18T12:00:00.000Z", endsAt: "2026-10-18T12:15:00.000Z", sector: { id: "stage", name: "Palco Juventude", slug: "palco-juventude" }, state: "ended" },
        { id: "mass", title: "Santa Missa", description: "Pe. Reginaldo Manzotti", startsAt: "2026-10-18T21:00:00.000Z", endsAt: "2026-10-18T22:30:00.000Z", sector: { id: "stage", name: "Palco Juventude", slug: "palco-juventude" }, state: "live" },
        { id: "meditation", title: "Meditação", description: null, startsAt: "2026-10-18T10:00:00.000Z", endsAt: "2026-10-18T11:00:00.000Z", sector: { id: "meditation", name: "Meditativo", slug: "espaco-meditativo" }, state: "upcoming" },
      ],
    });
  });

  it("uses Agora for relevant activities and Espacos for ordered real programme", async () => {
    const user = userEvent.setup();
    render(<EventScheduleScreen animDir="up" onBack={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: "Programação completa" })).toBeInTheDocument();
    expect(scheduleApi.list).toHaveBeenCalledOnce();
    expect(screen.getByText("Santa Missa")).toBeInTheDocument();
    expect(screen.getByText("Meditação")).toBeInTheDocument();
    expect(screen.getByText("Palco Juventude")).toBeInTheDocument();
    expect(screen.getByText("Meditativo")).toBeInTheDocument();
    expect(screen.queryByText("Abertura")).not.toBeInTheDocument();
    expect(screen.queryByText("Missão Radical")).not.toBeInTheDocument();
    expect(screen.queryByText(/Cronograma completo/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Espaços" }));
    expect(screen.getByText("Abertura")).toBeInTheDocument();
    expect(screen.getByText("Missão Radical")).toBeInTheDocument();
    expect(screen.getByText("ACONTECENDO AGORA")).toBeInTheDocument();
    expect(screen.getAllByText(/^(Palco Juventude|Radicalidade|Meditativo)$/).map((item) => item.textContent)).toEqual(["Palco Juventude", "Radicalidade", "Meditativo"]);
    expect(screen.getByText("Santa Missa").closest("details")).toHaveTextContent("Palco Juventude");
    expect(screen.getByText("Abertura").closest("details")).toHaveTextContent("Palco Juventude");
    expect(screen.getByText("Missão Radical").closest("details")).toHaveTextContent("Radicalidade");
  });
});
